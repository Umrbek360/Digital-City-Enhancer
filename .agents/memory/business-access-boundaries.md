---
name: Business access boundaries
description: The Digital City role model does not define business-staff membership.
---

Do not infer staff privileges from a Clerk account or client route state. Business data access must remain tied to server-validated ownership unless an explicit staff-membership model is introduced.

**Why:** The existing data model has no staff membership relation; granting staff access without one would bypass business ownership checks.

**How to apply:** If staff access is added, model each staff-to-business association and permission explicitly, then enforce it on every business-scoped API operation.
