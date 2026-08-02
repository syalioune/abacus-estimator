# Security policy

## Threat model, in short

Abacus is a static single-page app with **no backend, no account and no
telemetry**. An estimate lives in the browser's `localStorage` until someone
exports it. There is no server to attack and no data of ours to breach; the
realistic risks are supply-chain (a compromised dependency) and anything that
would let a page exfiltrate an estimate.

The shipped container enforces the second directly: the Content-Security-Policy
in `docker/nginx.conf` allows no outbound `connect-src` beyond `self`, so the
page cannot phone anywhere. If you fork this and add a backend, that header is
the first thing to revisit.

## Supported versions

The latest released minor receives fixes. Older tags do not.

## Reporting a vulnerability

Please report privately through
[GitHub Security Advisories](https://github.com/syalioune/abacus-estimator/security/advisories/new)
rather than opening a public issue.

Include what you can reproduce, the affected version or commit, and the impact
you think it has. You will get an acknowledgement within a few days and an
assessment within two weeks. If we agree it is a vulnerability we will fix it in
a patch release and credit you unless you prefer otherwise.

## Out of scope

- Anything requiring an attacker to already control the user's browser or machine
- Content injected by the user into their own estimate and rendered back to them
- Missing hardening headers when you serve `dist/` yourself with your own web
  server; the header set is part of `docker/nginx.conf`, not of the bundle
