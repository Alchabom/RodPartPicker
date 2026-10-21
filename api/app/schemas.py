from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base for API schemas: reads ORM objects, writes camelCase JSON keys."""

    model_config = ConfigDict(
        from_attributes=True, alias_generator=to_camel, populate_by_name=True
    )
