"""
Python port of api/routes/admin.ts.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from firebase_admin import auth
from pydantic import BaseModel

from auth import require_admin

# Express:
#   const adminRouter = express.Router();
#   adminRouter.use(requireAuth, reqUser, requireAdmin);
#
# FastAPI: router-wide dependencies are passed in when the router is created. Every route
# on this router runs require_admin (and, through it, require_auth) first.
router = APIRouter(dependencies=[Depends(require_admin)])


# --- GET /impersonate?userId=... -------------------------------------------
# Express reads `req.query.userId as string`. Here, any function argument that isn't a
# path param, a body model, or a Depends() is treated as a *query param*. `userId: str`
# with no default means "required": a request without it gets an automatic 422 with a
# JSON error before your code runs. (In the Node version, a missing userId reaches
# createCustomToken as `undefined` and surfaces as a 500.)
@router.get("/impersonate")
def impersonate(userId: str):
    try:
        # Python's SDK returns bytes, not a string; decode to put it in JSON.
        custom_token = auth.create_custom_token(userId).decode()
        return {"customToken": custom_token}
    except Exception:
        # Express: res.status(500).send('Server error') — a plain-text body.
        # Returning a Response object directly is how you opt out of auto-JSON.
        return PlainTextResponse("Server error", status_code=500)


# --- POST /set-role ---------------------------------------------------------
# Express: `const { userId, role } = req.body;` — trusts whatever JSON arrives.
#
# FastAPI: declare the body's shape as a Pydantic model. Any argument typed as a
# BaseModel is read from the JSON body and validated (wrong/missing fields -> 422).
# This is the zod-schema step and the bodyParser step rolled into the type annotation.
class SetRoleBody(BaseModel):
    userId: str
    role: str


@router.post("/set-role")
def set_role(body: SetRoleBody):
    try:
        user = auth.get_user(body.userId)
        # `{ ...customClaims, [role]: true }` — `**` is Python's object spread.
        # custom_claims is None (not {}) for a user with no claims, hence `or {}`.
        claims = {**(user.custom_claims or {}), body.role: True}
        auth.set_custom_user_claims(body.userId, claims)
        return {"message": f"Role {body.role} set for user {body.userId}"}  # f-string == template literal
    except Exception:
        return PlainTextResponse("Server error", status_code=500)
