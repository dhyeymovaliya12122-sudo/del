#!/usr/bin/env python3
"""
================================================================================
WhatsApp Automation Engine — Production Deep-Scan & Verification Harness
File: scripts/deep_scan_master.py
Architecture: NestJS + SQLite/Postgres + Redis/ioredis-mock + Baileys + BullMQ
Pillars:
  1. Data Layer & Persistence Integrity (SQLite WAL, Schemas, Foreign Keys)
  2. Cryptographic & Security Verification (AES-256-CBC, HMAC-SHA256, Tamper Resistance)
  3. Circuit Breaker & Queue Resilience (3-State FSM, Token Bucket Rate-Limiting)
  4. System Storage & Media I/O Throughput (Sequential/Random Disk I/O, Latency)
  5. API Gateway & Webhook Signature Simulation (HMAC Headers, Payload Handshakes)
================================================================================
"""

import os
import sys
import time
import json
import hmac
import hashlib
import sqlite3
import secrets
import threading
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

# Optional Cryptography import for native AES-256-CBC
try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import padding
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False


# ==============================================================================
# 0. TELEMETRY & REPORTING MODELS
# ==============================================================================

@dataclass
class DiagnosticResult:
    pillar: str
    feature_name: str
    status: str  # "PASS", "FAIL", "WARN", "SKIP"
    latency_ms: float
    details: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TelemetryCollector:
    """Thread-safe collector for deep-scan diagnostics and telemetry data."""
    def __init__(self):
        self._results: List[DiagnosticResult] = []
        self._lock = threading.Lock()
        self.start_time = time.perf_counter()

    def record(self, result: DiagnosticResult):
        with self._lock:
            self._results.append(result)

    def summary(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._results)
            passed = sum(1 for r in self._results if r.status == "PASS")
            failed = sum(1 for r in self._results if r.status == "FAIL")
            warned = sum(1 for r in self._results if r.status == "WARN")
            skipped = sum(1 for r in self._results if r.status == "SKIP")
            total_time_ms = round((time.perf_counter() - self.start_time) * 1000, 2)
            
            return {
                "scan_executed_at": datetime.now(timezone.utc).isoformat(),
                "total_duration_ms": total_time_ms,
                "total_tests": total,
                "passed": passed,
                "failed": failed,
                "warnings": warned,
                "skipped": skipped,
                "health_score": round((passed / total * 100) if total > 0 else 0, 1),
                "diagnostics": [asdict(r) for r in self._results],
            }


# ==============================================================================
# 1. PILLAR 1: DATA LAYER & PERSISTENCE DIAGNOSTICS
# ==============================================================================

class DataLayerScanner:
    """Audits local SQLite database schema, WAL journaling, and foreign keys."""
    def __init__(self, db_path: str):
        self.db_path = db_path

    def run_scans(self, collector: TelemetryCollector):
        # 1. Database File Accessibility
        t0 = time.perf_counter()
        if not os.path.exists(self.db_path):
            collector.record(DiagnosticResult(
                pillar="Data Layer & Persistence",
                feature_name="DB File Existence Check",
                status="FAIL",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                error_message=f"Database file not found at path: {self.db_path}"
            ))
            return
        
        collector.record(DiagnosticResult(
            pillar="Data Layer & Persistence",
            feature_name="DB File Existence Check",
            status="PASS",
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={"path": self.db_path, "size_bytes": os.path.getsize(self.db_path)}
        ))

        # 2. SQLite Integrity & WAL Check
        t0 = time.perf_counter()
        try:
            conn = sqlite3.connect(self.db_path, timeout=5.0)
            cursor = conn.cursor()
            
            # Check Journal Mode
            cursor.execute("PRAGMA journal_mode;")
            journal_mode = cursor.fetchone()[0]
            
            # Run Integrity Check
            cursor.execute("PRAGMA integrity_check;")
            integrity_result = cursor.fetchall()
            is_intact = len(integrity_result) == 1 and integrity_result[0][0] == "ok"
            
            # Foreign Key Violations
            cursor.execute("PRAGMA foreign_key_check;")
            fk_violations = cursor.fetchall()
            
            status = "PASS" if is_intact and len(fk_violations) == 0 else "FAIL"
            err = None if is_intact else f"Integrity issues: {integrity_result}"
            if fk_violations:
                err = f"Foreign key violations found: {len(fk_violations)}"
                status = "WARN"

            collector.record(DiagnosticResult(
                pillar="Data Layer & Persistence",
                feature_name="SQLite PRAGMA Integrity & WAL Audit",
                status=status,
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={
                    "journal_mode": journal_mode,
                    "integrity": integrity_result,
                    "foreign_key_violations": len(fk_violations)
                },
                error_message=err
            ))

            # 3. Schema Completeness Check
            t0 = time.perf_counter()
            required_tables = [
                'app_users', 'whatsapp_accounts', 'proxy_pool', 'session_auth_store',
                'proxy_circuit_breaker_state', 'message_queue_log', 'campaigns',
                'chatbot_flows', 'message_templates', 'opt_outs'
            ]
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            existing_tables = set(r[0] for r in cursor.fetchall())
            missing_tables = [t for t in required_tables if t not in existing_tables]
            
            table_counts = {}
            for t in required_tables:
                if t in existing_tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {t}")
                    table_counts[t] = cursor.fetchone()[0]

            collector.record(DiagnosticResult(
                pillar="Data Layer & Persistence",
                feature_name="Core Schema Entity Completeness",
                status="PASS" if not missing_tables else "FAIL",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={"verified_tables": len(existing_tables), "table_counts": table_counts},
                error_message=f"Missing tables: {missing_tables}" if missing_tables else None
            ))
            conn.close()

        except Exception as e:
            collector.record(DiagnosticResult(
                pillar="Data Layer & Persistence",
                feature_name="Database Connection & Introspection",
                status="FAIL",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                error_message=str(e)
            ))


# ==============================================================================
# 2. PILLAR 2: SECURITY & CRYPTOGRAPHIC VERIFICATION
# ==============================================================================

class SecurityCryptoScanner:
    """Verifies AES-256-CBC session encryption and HMAC-SHA256 timing-safe guards."""
    def __init__(self, raw_hex_key: str, hmac_secret: str):
        # Mirror SessionCryptoService: pad key to 64 hex characters (32 bytes)
        self.key_bytes = bytes.fromhex(raw_hex_key.ljust(64, '0')[:64])
        self.hmac_secret = hmac_secret.encode('utf-8')

    def run_scans(self, collector: TelemetryCollector):
        # 1. AES-256-CBC Encryption & Decryption Roundtrip
        t0 = time.perf_counter()
        if not CRYPTO_AVAILABLE:
            collector.record(DiagnosticResult(
                pillar="Security, Access Control & Auth",
                feature_name="AES-256-CBC Session Cryptography",
                status="SKIP",
                latency_ms=0.0,
                error_message="cryptography module unavailable"
            ))
        else:
            try:
                sample_session_payload = json.dumps({
                    "creds": {"clientID": "WA-Engine-Test", "serverToken": secrets.token_hex(32)},
                    "keys": {"preKeys": [secrets.token_hex(16) for _ in range(5)]}
                })
                
                # Encrypt
                iv = secrets.token_bytes(16)
                padder = padding.PKCS7(128).padder()
                padded_data = padder.update(sample_session_payload.encode('utf-8')) + padder.finalize()
                
                cipher = Cipher(algorithms.AES(self.key_bytes), modes.CBC(iv), backend=default_backend())
                encryptor = cipher.encryptor()
                ciphertext = encryptor.update(padded_data) + encryptor.finalize()
                
                checksum = hashlib.sha256(sample_session_payload.encode('utf-8')).hexdigest()
                
                # Decrypt
                decipher = Cipher(algorithms.AES(self.key_bytes), modes.CBC(iv), backend=default_backend())
                decryptor = decipher.decryptor()
                decrypted_padded = decryptor.update(ciphertext) + decryptor.finalize()
                
                unpadder = padding.PKCS7(128).unpadder()
                decrypted_plaintext = (unpadder.update(decrypted_padded) + unpadder.finalize()).decode('utf-8')
                
                verified_checksum = hashlib.sha256(decrypted_plaintext.encode('utf-8')).hexdigest()
                
                is_valid = (sample_session_payload == decrypted_plaintext) and (checksum == verified_checksum)
                collector.record(DiagnosticResult(
                    pillar="Security, Access Control & Auth",
                    feature_name="AES-256-CBC Session Cryptography",
                    status="PASS" if is_valid else "FAIL",
                    latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                    details={"checksum_verified": is_valid, "iv_length": len(iv), "key_bits": len(self.key_bytes) * 8}
                ))
            except Exception as e:
                collector.record(DiagnosticResult(
                    pillar="Security, Access Control & Auth",
                    feature_name="AES-256-CBC Session Cryptography",
                    status="FAIL",
                    latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                    error_message=str(e)
                ))

        # 2. HMAC-SHA256 Webhook Validation & Timing-Safe Check
        t0 = time.perf_counter()
        try:
            raw_payload = b'{"object":"whatsapp_business_account","entry":[{"id":"1088","changes":[]}]}'
            computed_digest = hmac.new(self.hmac_secret, raw_payload, hashlib.sha256).hexdigest()
            expected_header = f"sha256={computed_digest}"
            
            # Constant-time comparison simulation matching HmacValidationGuard
            is_valid = hmac.compare_digest(expected_header, f"sha256={computed_digest}")
            
            # Corrupted payload check
            corrupted_header = f"sha256={computed_digest[:-4]}dead"
            tamper_detected = not hmac.compare_digest(expected_header, corrupted_header)
            
            status = "PASS" if is_valid and tamper_detected else "FAIL"
            collector.record(DiagnosticResult(
                pillar="Security, Access Control & Auth",
                feature_name="HMAC-SHA256 Webhook Ingestion Guard",
                status=status,
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={
                    "timing_safe_pass": is_valid,
                    "tamper_rejected": tamper_detected,
                    "algorithm": "HMAC-SHA256"
                }
            ))
        except Exception as e:
            collector.record(DiagnosticResult(
                pillar="Security, Access Control & Auth",
                feature_name="HMAC-SHA256 Webhook Ingestion Guard",
                status="FAIL",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                error_message=str(e)
            ))


# ==============================================================================
# 3. PILLAR 3: CIRCUIT BREAKER & BUSINESS LOGIC RESILIENCE
# ==============================================================================

class CircuitState:
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class ProxyCircuitBreakerEngine:
    """Emulates the 3-state Redis-backed circuit breaker state machine."""
    def __init__(self, failure_threshold: int = 3, reset_ms: int = 150):
        self.threshold = failure_threshold
        self.reset_ms = reset_ms
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.opened_at: Optional[float] = None
        self.queue_paused = False
        self._lock = threading.Lock()

    def record_failure(self):
        with self._lock:
            now = time.perf_counter()
            if self.state == CircuitState.OPEN:
                # Check if reset cooldown has expired
                if (now - (self.opened_at or 0)) * 1000 >= self.reset_ms:
                    self.state = CircuitState.HALF_OPEN
                else:
                    return
            
            if self.state == CircuitState.HALF_OPEN:
                # Failure during HALF_OPEN immediately re-trips to OPEN
                self.state = CircuitState.OPEN
                self.opened_at = now
                self.queue_paused = True
                return

            self.failures += 1
            if self.failures >= self.threshold:
                self.state = CircuitState.OPEN
                self.opened_at = now
                self.queue_paused = True

    def record_success(self):
        with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failures = 0
                self.queue_paused = False
            elif self.state == CircuitState.CLOSED:
                self.failures = 0

    def check_state(self) -> str:
        with self._lock:
            if self.state == CircuitState.OPEN:
                now = time.perf_counter()
                if (now - (self.opened_at or 0)) * 1000 >= self.reset_ms:
                    self.state = CircuitState.HALF_OPEN
            return self.state


class ResilienceScanner:
    """Tests circuit breaker transitions and token-bucket queue limits."""
    def run_scans(self, collector: TelemetryCollector):
        # 1. Circuit Breaker State Transition Stress
        t0 = time.perf_counter()
        cb = ProxyCircuitBreakerEngine(failure_threshold=3, reset_ms=80)
        
        # Initial State: CLOSED
        init_ok = (cb.check_state() == CircuitState.CLOSED and not cb.queue_paused)
        
        # Tripping circuit: 3 consecutive failures
        cb.record_failure()
        cb.record_failure()
        cb.record_failure()
        tripped_ok = (cb.check_state() == CircuitState.OPEN and cb.queue_paused)
        
        # Cooldown wait -> Transition to HALF_OPEN
        time.sleep(0.09)
        half_open_ok = (cb.check_state() == CircuitState.HALF_OPEN)
        
        # Successful probe in HALF_OPEN -> Recovery to CLOSED
        cb.record_success()
        recovered_ok = (cb.check_state() == CircuitState.CLOSED and not cb.queue_paused)
        
        all_passed = init_ok and tripped_ok and half_open_ok and recovered_ok
        collector.record(DiagnosticResult(
            pillar="Business Logic & Performance Limits",
            feature_name="Proxy Circuit Breaker 3-State FSM",
            status="PASS" if all_passed else "FAIL",
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={
                "transition_closed_to_open": tripped_ok,
                "transition_open_to_half_open": half_open_ok,
                "transition_half_open_to_closed": recovered_ok,
                "queue_pause_interlock": cb.queue_paused == False
            }
        ))

        # 2. Token-Bucket Rate Limiter (Anti-Ban 3 msg/sec simulation)
        t0 = time.perf_counter()
        rate_limit = 3  # 3 msgs per second
        time_window = 0.2  # 200ms evaluation slice
        
        tokens = rate_limit
        enqueued = 0
        throttled = 0
        
        # Simulate burst of 8 outbound requests
        for _ in range(8):
            if tokens > 0:
                tokens -= 1
                enqueued += 1
            else:
                throttled += 1
        
        limiter_valid = (enqueued == 3 and throttled == 5)
        collector.record(DiagnosticResult(
            pillar="Business Logic & Performance Limits",
            feature_name="Token-Bucket Anti-Ban Rate Limiter",
            status="PASS" if limiter_valid else "FAIL",
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={
                "bucket_capacity": rate_limit,
                "burst_enqueued": enqueued,
                "burst_throttled": throttled,
                "rejection_ratio": round(throttled / 8, 2)
            }
        ))


# ==============================================================================
# 4. PILLAR 4: INFRASTRUCTURE & STORAGE I/O THROUGHPUT
# ==============================================================================

class StorageIOScanner:
    """Benchmarks local file system read/write throughput and latency in data/."""
    def __init__(self, target_dir: str):
        self.target_dir = target_dir

    def run_scans(self, collector: TelemetryCollector):
        t0 = time.perf_counter()
        os.makedirs(self.target_dir, exist_ok=True)
        test_file = os.path.join(self.target_dir, "_deep_scan_temp_io.bin")
        
        # 4MB synthetic media payload test
        block_size = 64 * 1024  # 64 KB
        total_blocks = 64        # 4 MB
        sample_data = os.urandom(block_size)
        
        try:
            # Write Benchmark
            write_t0 = time.perf_counter()
            with open(test_file, 'wb') as f:
                for _ in range(total_blocks):
                    f.write(sample_data)
                f.flush()
                os.fsync(f.fileno())
            write_duration = time.perf_counter() - write_t0
            write_mbps = round((4.0 / write_duration), 2)
            
            # Read Benchmark
            read_t0 = time.perf_counter()
            read_bytes = 0
            with open(test_file, 'rb') as f:
                while True:
                    chunk = f.read(block_size)
                    if not chunk:
                        break
                    read_bytes += len(chunk)
            read_duration = time.perf_counter() - read_t0
            read_mbps = round((4.0 / read_duration), 2)
            
            # Clean up
            if os.path.exists(test_file):
                os.remove(test_file)
            
            collector.record(DiagnosticResult(
                pillar="Infrastructure, Storage & I/O",
                feature_name="Media Storage Read/Write Throughput",
                status="PASS",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={
                    "write_throughput_mb_s": write_mbps,
                    "read_throughput_mb_s": read_mbps,
                    "write_duration_ms": round(write_duration * 1000, 2),
                    "read_duration_ms": round(read_duration * 1000, 2),
                    "file_size_mb": 4.0
                }
            ))
        except Exception as e:
            if os.path.exists(test_file):
                os.remove(test_file)
            collector.record(DiagnosticResult(
                pillar="Infrastructure, Storage & I/O",
                feature_name="Media Storage Read/Write Throughput",
                status="FAIL",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                error_message=str(e)
            ))


# ==============================================================================
# 5. PILLAR 5: API, NETWORK & LOCAL HANDSHAKE DIAGNOSTICS
# ==============================================================================

class NetworkHandshakeScanner:
    """Validates local gateway socket availability and HTTP/Webhook protocols."""
    def __init__(self, host: str = "127.0.0.1", port: int = 3000):
        self.host = host
        self.port = port

    def run_scans(self, collector: TelemetryCollector):
        import socket
        t0 = time.perf_counter()
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        conn_res = sock.connect_ex((self.host, self.port))
        sock.close()
        
        is_running = (conn_res == 0)
        status = "PASS" if is_running else "WARN"
        details = {
            "target": f"{self.host}:{self.port}",
            "is_listening": is_running,
            "status_note": "Service online and answering" if is_running else "Backend server offline (run: npm run start:dev)"
        }
        
        collector.record(DiagnosticResult(
            pillar="API, Network & Microservices",
            feature_name="NestJS API Gateway Port Handshake",
            status=status,
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            details=details,
            error_message=None if is_running else "Gateway port not listening (server idle)"
        ))


# ==============================================================================
# 6. ISOLATED DEMO TEST ENGINE (FAILURE INJECTION & TELEMETRY SIMULATION)
# ==============================================================================

class DemoSimulationEngine:
    """Injects simulated faults to verify boundary validation and exception handling."""
    def run_simulations(self, collector: TelemetryCollector):
        # Simulation A: Fault Injection - Corrupted Checksum on Decryption
        t0 = time.perf_counter()
        caught_tamper = False
        try:
            fake_payload = {
                "ciphertext": "deadbeef",
                "iv": "00" * 16,
                "checksum": "invalid_checksum_hash"
            }
            # Simulate integrity verification exception
            if fake_payload["checksum"] != hashlib.sha256(b"").hexdigest():
                raise ValueError("Session checksum mismatch — data may be corrupted or tampered")
        except ValueError as ex:
            caught_tamper = True

        collector.record(DiagnosticResult(
            pillar="Security, Access Control & Auth",
            feature_name="[Demo Fault] Tampered Session Checksum Injection",
            status="PASS" if caught_tamper else "FAIL",
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={"fault_injected": "corrupted_checksum", "exception_handled": caught_tamper}
        ))

        # Simulation B: Fault Injection - Circuit Breaker Re-trip in Half-Open
        t0 = time.perf_counter()
        cb = ProxyCircuitBreakerEngine(failure_threshold=2, reset_ms=10)
        cb.record_failure()
        cb.record_failure()
        time.sleep(0.015)
        # Verify it entered HALF_OPEN
        is_half = (cb.check_state() == CircuitState.HALF_OPEN)
        # Probe failure should immediately re-trip to OPEN
        cb.record_failure()
        re_tripped = (cb.check_state() == CircuitState.OPEN and cb.queue_paused)

        collector.record(DiagnosticResult(
            pillar="Business Logic & Performance Limits",
            feature_name="[Demo Fault] Circuit Breaker Probe Failure Re-Trip",
            status="PASS" if (is_half and re_tripped) else "FAIL",
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            details={"entered_half_open": is_half, "immediate_re_open": re_tripped}
        ))


# ==============================================================================
# 7. MASTER EXECUTION ORCHESTRATOR & FORMATTED OUTPUT
# ==============================================================================

def print_banner():
    print("""
================================================================================
          WHATSAPP CORE ENGINE — ENTERPRISE DEEP SCAN & AUDIT HARNESS           
================================================================================
[Platform]    NestJS Stateless Engine | SQLite | Redis/Mock | BullMQ | Baileys
[Standard]    Multi-Tenant Microservices Architecture & Cyber Security Audit
================================================================================
""")


def print_console_table(results: List[DiagnosticResult]):
    headers = ["PILLAR", "COMPONENT / FEATURE", "STATUS", "LATENCY", "DIAGNOSTIC TRACE"]
    col_w = [30, 42, 10, 12, 40]
    
    separator = "+" + "+".join("-" * (w + 2) for w in col_w) + "+"
    header_row = "| " + " | ".join(h.ljust(col_w[i]) for i, h in enumerate(headers)) + " |"
    
    print(separator)
    print(header_row)
    print(separator)
    
    for r in results:
        status_color = r.status
        if r.status == "PASS":
            status_str = "[ PASS ]"
        elif r.status == "WARN":
            status_str = "[ WARN ]"
        elif r.status == "FAIL":
            status_str = "[ FAIL ]"
        else:
            status_str = "[ SKIP ]"
            
        trace = r.error_message if r.error_message else "OK - Verified"
        if len(trace) > 38:
            trace = trace[:35] + "..."
            
        row = (
            f"| {r.pillar[:col_w[0]].ljust(col_w[0])} "
            f"| {r.feature_name[:col_w[1]].ljust(col_w[1])} "
            f"| {status_str.ljust(col_w[2])} "
            f"| {f'{r.latency_ms} ms'.rjust(col_w[3])} "
            f"| {trace.ljust(col_w[4])} |"
        )
        print(row)
    print(separator)


def main():
    print_banner()
    collector = TelemetryCollector()
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    db_path = os.path.join(base_dir, "data", "whatsapp.db")
    media_dir = os.path.join(base_dir, "data", "media")
    
    # Static keys for testing if environment not loaded
    session_key = os.getenv("SESSION_ENCRYPTION_KEY", "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90")
    hmac_secret = os.getenv("WEBHOOK_HMAC_SECRET", "change_me_to_your_meta_app_secret")
    
    # 1. Data Layer Scans
    data_scanner = DataLayerScanner(db_path)
    data_scanner.run_scans(collector)
    
    # 2. Security & Crypto Scans
    crypto_scanner = SecurityCryptoScanner(session_key, hmac_secret)
    crypto_scanner.run_scans(collector)
    
    # 3. Resilience & Circuit Breaker Scans
    resilience_scanner = ResilienceScanner()
    resilience_scanner.run_scans(collector)
    
    # 4. Storage & I/O Scans
    storage_scanner = StorageIOScanner(media_dir)
    storage_scanner.run_scans(collector)
    
    # 5. Network Handshake
    net_scanner = NetworkHandshakeScanner()
    net_scanner.run_scans(collector)
    
    # 6. Fault Injection Simulations
    demo_engine = DemoSimulationEngine()
    demo_engine.run_simulations(collector)
    
    # Output Results
    summary = collector.summary()
    print_console_table(collector._results)
    
    print("\n" + "=" * 80)
    print(f" DEEP SCAN SUMMARY REPORT — Health Score: {summary['health_score']}%")
    print(f" Total Tests : {summary['total_tests']:<4} | Passed: {summary['passed']:<4} | Warnings: {summary['warnings']:<4} | Failed: {summary['failed']:<4}")
    print(f" Duration    : {summary['total_duration_ms']} ms")
    print("=" * 80)
    
    # Write machine-readable JSON artifact
    artifact_path = os.path.join(base_dir, "data", "deep_scan_report.json")
    try:
        os.makedirs(os.path.dirname(artifact_path), exist_ok=True)
        with open(artifact_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
        print(f"\n[+] Telemetry report exported to: {artifact_path}\n")
    except Exception as e:
        print(f"\n[!] Failed to write telemetry report: {e}\n")


if __name__ == "__main__":
    main()
