"""Pydantic v2 models for structured resume data.

All models map 1:1 to the canonical JSON schema. Used for LLM output validation
and typed API responses.
"""

import json
from typing import Literal

from pydantic import BaseModel, Field

# -- Location models (context-specific) --


class Location(BaseModel):
    """Reusable location for personal_info. Full address fields."""

    city: str | None = None
    region: str | None = None  # State or province
    country: str | None = None
    country_code: str | None = None  # ISO 3166-1 alpha-2
    postal_code: str | None = None
    address: str | None = None  # Full street address


class ExperienceLocation(BaseModel):
    """Location for experience entries. Includes remote flag."""

    city: str | None = None
    region: str | None = None
    country: str | None = None
    remote: bool | None = None


class EducationLocation(BaseModel):
    """Location for education entries."""

    city: str | None = None
    region: str | None = None
    country: str | None = None


# -- Personal info --


class ProfileUrl(BaseModel):
    type: (
        Literal[
            "website",
            "linkedin",
            "github",
            "portfolio",
            "blog",
            "twitter",
            "other",
        ]
        | None
    ) = None
    url: str
    label: str | None = None


class PersonalInfo(BaseModel):
    name: str  # Required per schema
    label: str | None = None  # Professional title or tagline
    image: str | None = None  # URL to profile photo
    email: str | None = None
    phone: str | None = None
    location: Location | None = None
    urls: list[ProfileUrl] = Field(default_factory=list)
    date_of_birth: str | None = None  # ISO 8601 (YYYY-MM-DD)


# -- Experience --


class Experience(BaseModel):
    type: (
        Literal[
            "full-time",
            "part-time",
            "contract",
            "freelance",
            "internship",
            "volunteer",
            "apprenticeship",
            "self-employed",
            "other",
        ]
        | None
    ) = None
    company: str  # Required
    title: str  # Required
    location: ExperienceLocation | None = None
    start_date: str  # Required per schema
    end_date: str | None = None  # None means current
    current: bool | None = None
    description: str | None = None
    highlights: list[str] = Field(default_factory=list)


# -- Education --


class GPA(BaseModel):
    value: float
    max: float


class Education(BaseModel):
    institution: str  # Required
    degree: str | None = None
    field_of_study: str | None = None
    location: EducationLocation | None = None
    start_date: str | None = None
    graduation_date: str | None = None  # Not "end_date"
    gpa: GPA | None = None
    honors: str | None = None  # e.g. "cum laude", "Dean's List"
    courses: list[str] = Field(default_factory=list)


# -- Skill --


class Skill(BaseModel):
    # LLM-populated fields (extracted from resume text)
    skill: str  # Required — original skill name as written
    category: str | None = None  # e.g. "Programming Languages", "Web Frameworks"
    subcategory: str | None = None
    skill_type: Literal["hard", "soft"] | None = None
    proficiency: (
        Literal[
            "basic",
            "intermediate",
            "advanced",
            "expert",
        ]
        | None
    ) = None
    years_experience: float | None = None
    last_used: str | None = None  # YYYY-MM-DD or YYYY-MM

    # Post-processing fields (populated by taxonomy matching, not LLM)
    normalized: str | None = None
    skill_id: int | None = None
    proficiency_score: float | None = Field(default=None, ge=0, le=1)
    confidence: float | None = Field(default=None, ge=0, le=1)
    match_method: (
        Literal[
            "exact",
            "alias",
            "embedding",
            "none",
        ]
        | None
    ) = None


# -- Certification --


class Certification(BaseModel):
    name: str  # Required
    issuer: str | None = None
    date: str | None = None
    expiration_date: str | None = None
    credential_id: str | None = None
    url: str | None = None


# -- Language --


class Language(BaseModel):
    language: str  # Required — not "name"
    proficiency: (
        Literal[
            "elementary",
            "limited-working",
            "professional-working",
            "full-professional",
            "native",
        ]
        | None
    ) = None  # ILR scale
    fluency: (
        Literal[
            "basic",
            "conversational",
            "fluent",
            "native",
        ]
        | None
    ) = None  # Alternative descriptor


# -- Project --


class Project(BaseModel):
    name: str  # Required
    description: str | None = None
    role: str | None = None
    url: str | None = None
    start_date: str | None = None
    end_date: str | None = None  # None if ongoing
    technologies: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)


# -- Award --


class Award(BaseModel):
    title: str  # Required
    awarder: str | None = None
    date: str | None = None
    description: str | None = None


# -- Publication --


class Publication(BaseModel):
    title: str  # Required
    publisher: str | None = None
    publication_date: str | None = None
    url: str | None = None
    authors: list[str] = Field(default_factory=list)
    description: str | None = None


# -- Reference --


class Reference(BaseModel):
    name: str | None = None
    relationship: str | None = None  # e.g. "Manager", "Colleague"
    company: str | None = None
    email: str | None = None
    phone: str | None = None


# -- Root resume data --


class ResumeData(BaseModel):
    personal_info: PersonalInfo  # Required — no default factory
    experience: list[Experience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    languages: list[Language] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    awards: list[Award] = Field(default_factory=list)
    publications: list[Publication] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    references: list[Reference] = Field(default_factory=list)


def get_resume_json_schema() -> str:
    """Return the ResumeData JSON schema as a formatted string.

    Used in LLM prompts to instruct the model on expected output format.
    """
    return json.dumps(ResumeData.model_json_schema(), indent=2)
