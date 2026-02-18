import os
import fcntl
from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    needs_init = False
    if db_url.startswith('sqlite:'):
        path = db_url.replace('sqlite:///', '')
        if path.startswith('/'):
            needs_init = not os.path.exists(path)
        else:
            needs_init = not os.path.exists(os.path.join(app.instance_path, path))

    if needs_init:
        lock_path = os.path.join(os.path.dirname(path) if path.startswith('/') else app.instance_path, '.db_init.lock')
        os.makedirs(os.path.dirname(lock_path), exist_ok=True)
        with open(lock_path, 'w') as lock_file:
            try:
                fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
                # Won the lock — initialize DB
                db.create_all()
                from app.seed import seed
                seed()
            except BlockingIOError:
                # Another worker is initializing — wait for it
                fcntl.flock(lock_file, fcntl.LOCK_EX)
            finally:
                fcntl.flock(lock_file, fcntl.LOCK_UN)
    else:
        # Run lightweight migrations for existing databases
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        cols = [c['name'] for c in inspector.get_columns('approval_template_steps')]
        if 'is_enabled' not in cols:
            db.session.execute(text(
                'ALTER TABLE approval_template_steps ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT 1'
            ))
            db.session.commit()
