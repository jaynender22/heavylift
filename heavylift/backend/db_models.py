# backend/db_models.py
from sqlalchemy import String, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, DateTime, Text, UniqueConstraint
from sqlalchemy.sql import func
from db import Base, utcnow

class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    stored_path: Mapped[str] = mapped_column(String, nullable=False)
    sha256: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    versions: Mapped[list["ProfileVersion"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )

class ProfileVersion(Base):
    __tablename__ = "profile_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True, nullable=False)
    resume_id: Mapped[int | None] = mapped_column(ForeignKey("resumes.id"), nullable=True)

    data: Mapped[dict] = mapped_column(JSON, nullable=False)  # snapshot of saved fields/settings
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    profile: Mapped["Profile"] = relationship(back_populates="versions")


class ResumeChunk(Base):
    __tablename__ = "resume_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resume_id: Mapped[int] = mapped_column(Integer, ForeignKey("resumes.id"), index=True, nullable=False)

    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)  # 0..N (matches FAISS id)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class FieldCorrection(Base):
    __tablename__ = "field_corrections"

    id = Column(Integer, primary_key=True, index=True)

    domain = Column(String(255), index=True)              # jobs.lever.co
    fingerprint = Column(String(64), index=True)          # sha1 hex
    options_hash = Column(String(64), index=True)         # sha1 hex

    question_text = Column(Text, nullable=True)
    field_type = Column(String(50), nullable=True)        # text/select/radio/combobox...
    options_json = Column(Text, nullable=True)            # store options snapshot as JSON string

    correct_value = Column(Text, nullable=False)
    fill_strategy = Column(String(64), nullable=False)    # type_text/select_exact/radio_label/combobox_type_enter

    hits = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("domain", "fingerprint", "options_hash", name="uq_domain_fp_opts"),
    )
