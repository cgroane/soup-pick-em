"""
Python port of requireAuth / reqUser / requireAdmin from api/middlware.ts.

This is where FastAPI differs most from Express.

Express middleware is a *chain*: (req, res, next) => { ...; next() }. Each one mutates `req`
(e.g. `req.user = decodedToken`) and passes control along. Nothing about the handler's
signature tells you what ran before it.

FastAPI uses *dependencies* instead. A dependency is a plain function whose return value is
injected into whoever asks for it with `Depends(...)`. Instead of "run this, then call next()",
it's "to produce X, you first need Y". FastAPI resolves that graph for every request.

    Express:  requireAuth  --next()-->  requireAdmin  --next()-->  handler(req.user)
    FastAPI:  handler(user = Depends(require_admin))
                              require_admin(user = Depends(require_auth))
                                                 require_auth(authorization header)

To stop the request (Express: `return res.status(401).json(...)` without calling next),
a dependency *raises* an HTTPException. There is no `next` to forget to call.
"""

from fastapi import Depends, Header, HTTPException
from firebase_admin import auth


# `authorization: str | None = Header(default=None)` tells FastAPI to read the
# `Authorization` request header into this argument. You don't dig through req.headers;
# you declare what you need and FastAPI fetches it.
#
# Plain `def` (not `async def`) on purpose: the Python firebase_admin SDK is *blocking*
# (no promises). FastAPI runs sync functions on a thread pool so they don't stall the server.
# In Node every I/O call is async by default; in Python you choose, and mixing a blocking
# call into an `async def` would freeze every other request while it waits.
def require_auth(authorization: str | None = Header(default=None)) -> dict:
    token = authorization.split(" ")[1] if authorization and " " in authorization else None
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        # verify_id_token returns a dict of claims: {"uid": ..., "admin": True, ...}
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


# `reqUser` from the Node version has no equivalent: require_auth either returns a user or
# raises, so "is there a user?" can't be false by the time anything else runs.
def require_admin(user: dict = Depends(require_auth)) -> dict:
    if not user.get("admin"):  # dict.get returns None instead of throwing on a missing key
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
