from pydantic import BaseModel, Field, field_validator


class DiagramSourceMetadata(BaseModel):
    input_type: str
    file_name: str
    file_size: int
    pages_processed: int | None = None
    extractor_used: str


class DiagramExtractResponse(BaseModel):
    extract_id: str
    extracted_system_description: str
    source_metadata: DiagramSourceMetadata


class DiagramAnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    extract_id: str = Field(..., min_length=8, max_length=128)
    system_description: str | None = Field(default=None, max_length=5000)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title cannot be blank")
        return cleaned

    @field_validator("system_description")
    @classmethod
    def validate_system_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("system description cannot be blank")
        if len(cleaned) < 10:
            raise ValueError("system description must be at least 10 characters")
        return cleaned
