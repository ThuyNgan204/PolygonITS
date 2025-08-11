from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import as_declarative, declared_attr
from sqlalchemy.dialects.postgresql import JSONB


@as_declarative()
class Base():
    __name__: str

    # to generate tablename from classname as lower name
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()

    def __repr__(self):
        return '<{} with {}>'.format(self.__tablename__, self.id)

    def update(self, value):
        for k, v in value.items():
            if k != 'id':
                setattr(self, k, v)

# Model
class Camera(Base):
    __tablename__ = "camera"
    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String, index=True)
    name = Column(String, index=True)
    points = Column(JSONB, nullable=True)

