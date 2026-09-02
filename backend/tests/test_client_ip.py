"""X-Forwarded-For must be honoured only when the peer is a trusted proxy."""
import pathlib
import sys

import pytest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.utils.client_ip import UNKNOWN_CLIENT, client_ip


class FakeRequest:
    def __init__(self, peer, forwarded=None):
        self.client = type("C", (), {"host": peer})() if peer else None
        self.headers = {"x-forwarded-for": forwarded} if forwarded else {}


def test_direct_public_client_uses_the_socket_peer():
    assert client_ip(FakeRequest("203.0.113.7")) == "203.0.113.7"


def test_a_public_client_cannot_spoof_its_identity():
    """The header must be ignored when the request did not come via a proxy."""
    request = FakeRequest("203.0.113.7", forwarded="1.2.3.4")
    assert client_ip(request) == "203.0.113.7"


def test_forwarded_for_is_used_behind_a_trusted_proxy():
    request = FakeRequest("10.0.0.5", forwarded="198.51.100.23")
    assert client_ip(request) == "198.51.100.23"


def test_client_prepended_entries_are_not_trusted():
    """A client can pre-populate the header; only the proxy-appended tail counts."""
    request = FakeRequest("10.0.0.5", forwarded="1.1.1.1, 198.51.100.23")
    assert client_ip(request) == "198.51.100.23"


def test_chained_proxies_resolve_to_the_first_non_proxy_hop():
    request = FakeRequest("127.0.0.1", forwarded="198.51.100.23, 10.0.0.9")
    assert client_ip(request) == "198.51.100.23"


@pytest.mark.parametrize("forwarded", ["", "   ", "not-an-ip", ","])
def test_malformed_headers_fall_back_to_the_peer(forwarded):
    assert client_ip(FakeRequest("10.0.0.5", forwarded=forwarded)) == "10.0.0.5"


def test_all_proxy_hops_falls_back_to_the_peer():
    assert client_ip(FakeRequest("10.0.0.5", forwarded="10.0.0.9, 192.168.1.1")) == "10.0.0.5"


def test_missing_client_is_reported_as_unknown():
    assert client_ip(FakeRequest(None)) == UNKNOWN_CLIENT


def test_distinct_clients_behind_one_proxy_get_distinct_keys():
    """The whole point: one proxy must not collapse everyone into one budget."""
    a = client_ip(FakeRequest("10.0.0.5", forwarded="198.51.100.1"))
    b = client_ip(FakeRequest("10.0.0.5", forwarded="198.51.100.2"))
    assert a != b
