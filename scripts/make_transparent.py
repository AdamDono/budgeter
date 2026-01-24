from PIL import Image

def remove_black_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # Check if the pixel is close to black
        # Adjust threshold as needed
        if item[0] < 30 and item[1] < 30 and item[2] < 30:
            # Make it fully transparent
            newData.append((0, 0, 0, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

if __name__ == "__main__":
    remove_black_background("/Users/dam1mac89/Desktop/budgeter/public/logo_blue_raw.png", "/Users/dam1mac89/Desktop/budgeter/public/logo_blue_transparent.png")
