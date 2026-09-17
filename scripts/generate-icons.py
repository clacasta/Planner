"""Genera los iconos PNG de la PWA (iconos normales + maskable + apple-touch)."""
from PIL import Image, ImageDraw

PAPER = "#FFFCF0"
INK = "#100F0F"
GRID = "#DAD8CE"
BARS = [("#205EA6", 0.10, 0.34), ("#5E409D", 0.10, 0.52), ("#66800B", 0.10, 0.70)]
NOW = "#AF3029"


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    """Dibuja un mini-Gantt de 24h sobre papel Flexoki."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = int(size * 0.22) if maskable else 0
    radius = 0 if maskable else int(size * 0.22)

    if maskable:
        d.rectangle([0, 0, size, size], fill=PAPER)
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=PAPER,
                            outline=GRID, width=max(1, size // 128))

    inner = size - 2 * pad
    x0 = pad + int(inner * 0.10)
    x1 = pad + int(inner * 0.90)
    y_top = pad + int(inner * 0.30)
    bar_h = max(2, int(inner * 0.10))
    gap = int(inner * 0.09)

    # Regla horaria superior (marcas cada 3h)
    tick_y = pad + int(inner * 0.20)
    for i in range(5):
        tx = x0 + (x1 - x0) * i / 4
        d.line([tx, tick_y - inner * 0.03, tx, tick_y], fill=GRID, width=max(1, size // 160))

    # Barras de actividades (longitudes distintas, como un día real)
    lengths = [0.95, 0.62, 0.80]
    offsets = [0.0, 0.18, 0.42]
    for row, (color, _, _) in enumerate(zip(BARS, lengths, offsets)):
        _ = color
        y = y_top + int((bar_h + gap) * row)
        bx0 = x0 + int((x1 - x0) * offsets[row] * 0.5)
        bx1 = min(x1, bx0 + int((x1 - x0) * lengths[row]))
        d.rounded_rectangle([bx0, y, bx1, y + bar_h], radius=max(1, bar_h // 3), fill=BARS[row][0])

    # Línea de "ahora"
    now_x = x0 + int((x1 - x0) * 0.66)
    d.line([now_x, tick_y - int(inner * 0.04), now_x, y_top + int((bar_h + gap) * 2) + bar_h],
           fill=NOW, width=max(1, int(inner * 0.018)))

    # Punto de marca inferior
    d.ellipse([x0, pad + int(inner * 0.90), x0 + int(inner * 0.07), pad + int(inner * 0.90) + int(inner * 0.07)],
              fill=INK)
    return img


for size, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
    draw_icon(size).save(f"public/icons/{name}")

draw_icon(512, maskable=True).save("public/icons/icon-maskable-512.png")
draw_icon(180).save("public/icons/apple-touch-icon.png")
draw_icon(1024).save("public/icons/icon-1024.png")
print("iconos generados")
