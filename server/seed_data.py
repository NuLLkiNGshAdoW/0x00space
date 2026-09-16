"""
Утилита для наполнения БД тестовыми данными на время разработки.

Запуск:
    python seed_data.py
"""
from app.database import SessionLocal, Base, engine
from app import models

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    if db.query(models.Resource).count() == 0:
        db.add_all([
            models.Resource(
                title="Faithful 32x",
                description="Классический текстур-пак с детализацией x32",
                resource_type=models.ResourceType.TEXTURE_PACK,
                game_category=models.GameCategory.MINECRAFT,
                game_version="1.21.1",
                download_url="https://example.com/faithful32x.zip",
                cover_image_url="https://example.com/covers/faithful32x.png",
            ),
            models.Resource(
                title="BSL Shaders",
                description="Мягкое освещение и реалистичная вода",
                resource_type=models.ResourceType.SHADER,
                game_category=models.GameCategory.MINECRAFT,
                game_version="1.21.1",
                download_url="https://example.com/bsl-shaders.zip",
                cover_image_url="https://example.com/covers/bsl.png",
            ),
            models.Resource(
                title="Гайд: как не поймать призрака врасплох",
                description="Разбор поведения призраков и советы по расследованиям",
                resource_type=models.ResourceType.GUIDE,
                game_category=models.GameCategory.HORROR,
                download_url="https://example.com/guides/phasmophobia-guide.pdf",
                cover_image_url="https://example.com/covers/phasmophobia.png",
            ),
        ])

    if db.query(models.Seed).count() == 0:
        db.add_all([
            models.Seed(
                title="Деревня у разлома",
                seed_code="847293651",
                coordinates="X: 120, Z: -340",
                minecraft_version="1.21.1",
                description="Деревня прямо рядом со входом в древний город",
                screenshot_url="https://example.com/seeds/seed1.png",
            ),
        ])

    db.commit()
    print("Тестовые данные успешно добавлены.")
finally:
    db.close()
