# Import all the models, so that Base has them before being
# used by Alembic or init_db
from backend.app.db.session import Base
from backend.app.models import (
    UserProfile,
    InternshipPreference,
    Job,
    Application,
    Contact,
    OutreachEmail,
)

__all__ = ["Base"]
