from PIL import Image
import os

# Source image
src = "/home/pool/.gemini/antigravity/brain/99f3ff7b-34a8-49c7-a575-f566b659af36/live_balance_favicon_1764757842415.png"
output_dir = "/home/pool/Live-Balance/frontend/public"

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Open source image
img = Image.open(src)

# Convert to RGBA if not already
img = img.convert('RGBA')

# Create different sizes
sizes = [
    (16, 16, "favicon-16x16.png"),
    (32, 32, "favicon-32x32.png"),
    (180, 180, "apple-touch-icon.png"),
    (192, 192, "android-chrome-192x192.png"),
    (512, 512, "android-chrome-512x512.png")
]

for width, height, filename in sizes:
    resized = img.resize((width, height), Image.Resampling.LANCZOS)
    resized.save(os.path.join(output_dir, filename))
    print(f"Created {filename}")

# Create ICO file with multiple sizes
ico_sizes = [(16, 16), (32, 32), (48, 48)]
ico_images = [img.resize(size, Image.Resampling.LANCZOS) for size in ico_sizes]
ico_images[0].save(
    os.path.join(output_dir, "favicon.ico"),
    format='ICO',
    sizes=ico_sizes
)
print("Created favicon.ico")

print("All favicons created successfully!")
