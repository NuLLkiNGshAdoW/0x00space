"""Provision and manage named administrator accounts."""
import argparse
from getpass import getpass

from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal
from app.services.admin_credentials import hash_password, normalize_username


def _read_password() -> str:
    password = getpass("Password (12-256 characters): ")
    confirmation = getpass("Confirm password: ")
    if password != confirmation:
        raise ValueError("Passwords do not match")
    return password


def _create(db: Session, username: str) -> None:
    username = normalize_username(username)
    if db.query(models.AdminUser).filter(models.AdminUser.username == username).first():
        raise ValueError(f"Administrator '{username}' already exists")
    user = models.AdminUser(username=username, password_hash=hash_password(_read_password()))
    db.add(user)
    db.commit()
    print(f"Created administrator '{username}'")


def _list(db: Session) -> None:
    users = db.query(models.AdminUser).order_by(models.AdminUser.username.asc()).all()
    for user in users:
        status = "active" if user.is_active else "disabled"
        print(f"{user.username}\t{status}")


def _set_password(db: Session, username: str) -> None:
    user = _get_user(db, username)
    user.password_hash = hash_password(_read_password())
    user.session_version += 1
    db.commit()
    print(f"Updated password and revoked sessions for '{user.username}'")


def _set_active(db: Session, username: str, is_active: bool) -> None:
    user = _get_user(db, username)
    user.is_active = is_active
    user.session_version += 1
    db.commit()
    status = "enabled" if is_active else "disabled"
    print(f"{status.capitalize()} '{user.username}' and revoked existing sessions")


def _revoke_sessions(db: Session, username: str) -> None:
    user = _get_user(db, username)
    user.session_version += 1
    db.commit()
    print(f"Revoked sessions for '{user.username}'")


def _get_user(db: Session, username: str) -> models.AdminUser:
    username = normalize_username(username)
    user = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
    if user is None:
        raise ValueError(f"Administrator '{username}' does not exist")
    return user


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("list", help="List administrator usernames and status")
    create_parser = commands.add_parser("create", help="Create an administrator")
    create_parser.add_argument("username")
    for command in ("set-password", "disable", "enable", "revoke-sessions"):
        subparser = commands.add_parser(command)
        subparser.add_argument("username")
    args = parser.parse_args()

    with SessionLocal() as db:
        if args.command == "create":
            _create(db, args.username)
        elif args.command == "list":
            _list(db)
        elif args.command == "set-password":
            _set_password(db, args.username)
        elif args.command == "disable":
            _set_active(db, args.username, False)
        elif args.command == "enable":
            _set_active(db, args.username, True)
        else:
            _revoke_sessions(db, args.username)


if __name__ == "__main__":
    main()
