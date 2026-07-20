#!/usr/bin/env python3
"""Generate lightweight WebP variants for the Seller Pro static interface."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    "imagens/logos/nova-era.png": ("imagens/logos/nova-era.webp", 720, 82),
    "imagens/banners/lojapronta.png": ("imagens/banners/lojapronta.webp", 1100, 80),
    "imagens/banners/Planilhasonline.png": ("imagens/banners/planilhas-online.webp", 720, 82),
    "imagens/banners/Dbaefba.png": ("imagens/banners/dba-fba.webp", 720, 82),
    "imagens/banners/Treinamento.png": ("imagens/banners/treinamento.webp", 720, 82),
    "imagens/banners/Arquivoparabaixar.png": ("imagens/banners/arquivos-download.webp", 720, 82),
    "imagens/banners/Pocketamazon.png": ("imagens/banners/pocket-amazon.webp", 720, 82),
}


def optimize(source_relative: str, target_relative: str, max_size: int, quality: int) -> None:
    source = ROOT / source_relative
    target = ROOT / target_relative
    with Image.open(source) as image:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, "WEBP", quality=quality, method=6)
        print(f"{source_relative} -> {target_relative}: {source.stat().st_size} -> {target.stat().st_size} bytes")


if __name__ == "__main__":
    for source, (target, max_size, quality) in TARGETS.items():
        optimize(source, target, max_size, quality)
