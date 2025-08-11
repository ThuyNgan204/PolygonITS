import base64

def image_to_base64(image_path):
    """Convert an image to Base64."""
    with open(image_path, "rb") as image_file:
        base64_string = base64.b64encode(image_file.read()).decode("utf-8")
    return base64_string