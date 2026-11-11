import ipaddress

def get_client_ip(request):
    """
    Safely extract and validate a single client IP address from request headers.
    Handles proxy chains (e.g. X-Forwarded-For: client, proxy1, proxy2),
    bracketed IPv6 with ports, IPv4 with ports, and returns a valid
    IP string compatible with Django's GenericIPAddressField and PostgreSQL's inet type.
    Falls back to '127.0.0.1' on any parsing or validation failure.
    """
    if not request:
        return '127.0.0.1'

    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Take the very first IP in the proxy chain (the original client)
        raw_ip = str(x_forwarded_for).split(',')[0].strip()
    else:
        raw_ip = request.META.get('REMOTE_ADDR', '127.0.0.1')

    if not raw_ip:
        return '127.0.0.1'

    # Strip whitespace and quotes
    raw_ip = str(raw_ip).strip().strip('"').strip("'")

    # If IPv4 with port (e.g. 192.168.1.1:8080)
    if ':' in raw_ip and '.' in raw_ip:
        raw_ip = raw_ip.split(':')[0].strip()

    # If IPv6 with brackets (e.g. [2001:db8::1]:8080)
    if raw_ip.startswith('[') and ']' in raw_ip:
        raw_ip = raw_ip[1:raw_ip.index(']')]

    # Validate with Python's ipaddress module
    try:
        ipaddress.ip_address(raw_ip)
        return raw_ip
    except (ValueError, TypeError, Exception):
        return '127.0.0.1'
