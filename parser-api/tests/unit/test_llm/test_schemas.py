"""Unit tests for resume Pydantic schemas."""

import json

import pytest
from pydantic import ValidationError

from src.llm.schemas import (
    ResumeData,
    Skill,
    get_resume_json_schema,
)


def test_resume_data_minimal() -> None:
    """Provide minimal dict with only personal_info.name. All lists empty."""
    data = {"personal_info": {"name": "Jane"}}
    resume = ResumeData.model_validate(data)
    assert resume.personal_info.name == "Jane"
    assert resume.experience == []
    assert resume.education == []
    assert resume.skills == []
    assert resume.certifications == []
    assert resume.languages == []
    assert resume.projects == []
    assert resume.awards == []
    assert resume.publications == []
    assert resume.interests == []
    assert resume.references == []


def test_resume_data_full_parse() -> None:
    """Complete dict with all sections populated. model_validate succeeds."""
    data = {
        "personal_info": {
            "name": "Jane Doe",
            "label": "Software Engineer",
            "email": "jane@example.com",
            "location": {"city": "NYC", "region": "NY", "country": "US"},
            "urls": [{"url": "https://linkedin.com/in/jane", "type": "linkedin"}],
        },
        "experience": [
            {
                "company": "Acme",
                "title": "Developer",
                "start_date": "2022-01",
                "highlights": ["Built APIs"],
            }
        ],
        "education": [
            {
                "institution": "State University",
                "degree": "BS",
                "field_of_study": "CS",
                "graduation_date": "2021-06",
                "gpa": {"value": 3.8, "max": 4.0},
            }
        ],
        "skills": [
            {"skill": "Python", "category": "Languages", "proficiency": "expert"}
        ],
        "certifications": [{"name": "AWS Certified", "issuer": "Amazon"}],
        "languages": [{"language": "English", "fluency": "native"}],
        "projects": [{"name": "Open Source Tool", "technologies": ["Python"]}],
        "awards": [{"title": "Employee of the Year"}],
        "publications": [{"title": "Paper Title", "authors": ["Jane"]}],
        "interests": ["Reading"],
        "references": [{"name": "John", "relationship": "Manager"}],
    }
    resume = ResumeData.model_validate(data)
    assert resume.personal_info.name == "Jane Doe"
    assert len(resume.experience) == 1
    assert resume.experience[0].company == "Acme"
    assert len(resume.education) == 1
    assert resume.education[0].institution == "State University"
    assert len(resume.skills) == 1
    assert resume.skills[0].skill == "Python"
    assert len(resume.awards) == 1
    assert resume.awards[0].title == "Employee of the Year"
    assert len(resume.publications) == 1
    assert resume.publications[0].title == "Paper Title"
    assert resume.interests == ["Reading"]
    assert len(resume.references) == 1


def test_personal_info_requires_name() -> None:
    """personal_info without name raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ResumeData.model_validate({"personal_info": {}})
    errors = exc_info.value.errors()
    assert any("name" in str(e).lower() or "required" in str(e).lower() for e in errors)


def test_resume_data_requires_personal_info() -> None:
    """Empty dict raises ValidationError (personal_info required)."""
    with pytest.raises(ValidationError):
        ResumeData.model_validate({})


def test_experience_requires_company_title_start_date() -> None:
    """Experience entry missing start_date raises ValidationError."""
    data = {
        "personal_info": {"name": "Jane"},
        "experience": [{"company": "Acme", "title": "Dev"}],
    }
    with pytest.raises(ValidationError) as exc_info:
        ResumeData.model_validate(data)
    errors = exc_info.value.errors()
    assert any("start_date" in str(e) or "required" in str(e).lower() for e in errors)


def test_education_requires_institution() -> None:
    """Education entry missing institution raises ValidationError."""
    data = {
        "personal_info": {"name": "Jane"},
        "education": [{"degree": "BS"}],
    }
    with pytest.raises(ValidationError) as exc_info:
        ResumeData.model_validate(data)
    errors = exc_info.value.errors()
    assert any("institution" in str(e).lower() for e in errors)


def test_skill_requires_skill_name() -> None:
    """Skill entry missing skill raises ValidationError."""
    data = {
        "personal_info": {"name": "Jane"},
        "skills": [{"category": "Languages"}],
    }
    with pytest.raises(ValidationError) as exc_info:
        ResumeData.model_validate(data)
    errors = exc_info.value.errors()
    assert any("skill" in str(e).lower() for e in errors)


def test_skill_proficiency_enum_validated() -> None:
    """proficiency='expert' valid; proficiency='master' raises ValidationError."""
    data = {
        "personal_info": {"name": "Jane"},
        "skills": [{"skill": "Python", "proficiency": "expert"}],
    }
    resume = ResumeData.model_validate(data)
    assert resume.skills[0].proficiency == "expert"

    data_bad = {
        "personal_info": {"name": "Jane"},
        "skills": [{"skill": "Python", "proficiency": "master"}],
    }
    with pytest.raises(ValidationError):
        ResumeData.model_validate(data_bad)


def test_skill_post_processing_fields_default_null() -> None:
    """Skill(skill='Python') has normalized, skill_id, confidence, match_method None."""
    skill = Skill(skill="Python")
    assert skill.normalized is None
    assert skill.skill_id is None
    assert skill.confidence is None
    assert skill.match_method is None


def test_experience_type_enum_validated() -> None:
    """type='full-time' valid; type='seasonal' raises ValidationError."""
    data = {
        "personal_info": {"name": "Jane"},
        "experience": [
            {
                "company": "Acme",
                "title": "Dev",
                "start_date": "2022-01",
                "type": "full-time",
            }
        ],
    }
    resume = ResumeData.model_validate(data)
    assert resume.experience[0].type == "full-time"

    data_bad = {
        "personal_info": {"name": "Jane"},
        "experience": [
            {
                "company": "Acme",
                "title": "Dev",
                "start_date": "2022-01",
                "type": "seasonal",
            }
        ],
    }
    with pytest.raises(ValidationError):
        ResumeData.model_validate(data_bad)


def test_language_proficiency_ilr_enum() -> None:
    """full-professional valid; 'fluent' in proficiency raises ValidationError."""
    data = {
        "personal_info": {"name": "Jane"},
        "languages": [{"language": "English", "proficiency": "full-professional"}],
    }
    resume = ResumeData.model_validate(data)
    assert resume.languages[0].proficiency == "full-professional"

    data_bad = {
        "personal_info": {"name": "Jane"},
        "languages": [{"language": "English", "proficiency": "fluent"}],
    }
    with pytest.raises(ValidationError):
        ResumeData.model_validate(data_bad)


def test_language_fluency_enum() -> None:
    """fluency='fluent' is valid."""
    data = {
        "personal_info": {"name": "Jane"},
        "languages": [{"language": "English", "fluency": "fluent"}],
    }
    resume = ResumeData.model_validate(data)
    assert resume.languages[0].fluency == "fluent"


def test_location_structured_object() -> None:
    """personal_info.location as object is populated correctly."""
    data = {
        "personal_info": {
            "name": "Jane",
            "location": {"city": "NYC", "region": "NY", "country": "US"},
        },
    }
    resume = ResumeData.model_validate(data)
    loc = resume.personal_info.location
    assert loc is not None
    assert loc.city == "NYC"
    assert loc.region == "NY"
    assert loc.country == "US"


def test_urls_array_with_types() -> None:
    """urls=[{url, type: 'github'}] populates ProfileUrl."""
    data = {
        "personal_info": {
            "name": "Jane",
            "urls": [{"url": "https://github.com/jane", "type": "github"}],
        },
    }
    resume = ResumeData.model_validate(data)
    assert len(resume.personal_info.urls) == 1
    assert resume.personal_info.urls[0].url == "https://github.com/jane"
    assert resume.personal_info.urls[0].type == "github"


def test_gpa_structured_object() -> None:
    """gpa={value: 3.8, max: 4.0} populates GPA."""
    data = {
        "personal_info": {"name": "Jane"},
        "education": [
            {
                "institution": "State U",
                "gpa": {"value": 3.8, "max": 4.0},
            }
        ],
    }
    resume = ResumeData.model_validate(data)
    gpa = resume.education[0].gpa
    assert gpa is not None
    assert gpa.value == 3.8
    assert gpa.max == 4.0


def test_education_graduation_date_not_end_date() -> None:
    """graduation_date is used; end_date is not a valid field."""
    data = {
        "personal_info": {"name": "Jane"},
        "education": [{"institution": "State U", "graduation_date": "2023-06"}],
    }
    resume = ResumeData.model_validate(data)
    assert resume.education[0].graduation_date == "2023-06"
    # Education model has no end_date
    assert (
        not hasattr(resume.education[0], "end_date")
        or getattr(resume.education[0], "end_date", None) is None
    )


def test_dates_accept_freeform_strings() -> None:
    """Dates '2023-01', '2023', 'Jan 2023' pass (string, no format enforcement)."""
    data = {
        "personal_info": {"name": "Jane"},
        "experience": [
            {"company": "A", "title": "T", "start_date": "2023-01"},
            {"company": "B", "title": "T", "start_date": "2023"},
            {"company": "C", "title": "T", "start_date": "Jan 2023"},
        ],
    }
    resume = ResumeData.model_validate(data)
    assert resume.experience[0].start_date == "2023-01"
    assert resume.experience[1].start_date == "2023"
    assert resume.experience[2].start_date == "Jan 2023"


def test_json_schema_export() -> None:
    """get_resume_json_schema() returns valid JSON with all top-level field names."""
    schema_str = get_resume_json_schema()
    schema = json.loads(schema_str)
    expected = {
        "personal_info",
        "experience",
        "education",
        "skills",
        "certifications",
        "languages",
        "projects",
        "awards",
        "publications",
        "interests",
        "references",
    }
    props = schema.get("properties", {})
    for key in expected:
        assert key in props, f"Expected key {key} in schema"


def test_awards_model() -> None:
    """awards=[{title: 'Employee of the Year'}] is valid."""
    data = {
        "personal_info": {"name": "Jane"},
        "awards": [{"title": "Employee of the Year"}],
    }
    resume = ResumeData.model_validate(data)
    assert len(resume.awards) == 1
    assert resume.awards[0].title == "Employee of the Year"


def test_publications_model() -> None:
    """publications=[{title, authors: ['Jane']}] is valid."""
    data = {
        "personal_info": {"name": "Jane"},
        "publications": [{"title": "Paper Title", "authors": ["Jane"]}],
    }
    resume = ResumeData.model_validate(data)
    assert len(resume.publications) == 1
    assert resume.publications[0].title == "Paper Title"
    assert resume.publications[0].authors == ["Jane"]
