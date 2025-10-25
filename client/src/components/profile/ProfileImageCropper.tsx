import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Check, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import Cropper from "react-easy-crop";

type PixelCrop = { x: number; y: number; width: number; height: number };

export type ProfileImageCropperProps = {
  initialImage: string | null;
  nameForInitials?: string;
  onCropped: (imageBase64: string | null) => void;
  avatarSizeClass?: string; // e.g., "h-24 w-24"
  title?: string;
  description?: string;
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: PixelCrop | null
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || !pixelCrop) return imageSrc;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return canvas.toDataURL("image/jpeg", 0.95);
};

function getInitials(name?: string) {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function ProfileImageCropper({
  initialImage,
  nameForInitials,
  onCropped,
  avatarSizeClass = "h-24 w-24",
  title = "Crop Image",
  description = "Drag and zoom to adjust your profile picture",
}: ProfileImageCropperProps) {
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(initialImage || null);

  useEffect(() => {
    setPreviewImage(initialImage || null);
  }, [initialImage]);

  const onCropComplete = useCallback((_: any, pixels: PixelCrop) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const applyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
    setPreviewImage(cropped);
    setShowCropper(false);
    setImageSrc(null);
    onCropped(cropped);
  };

  const cancelCrop = () => {
    setShowCropper(false);
    setImageSrc(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      // too large
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className={`${avatarSizeClass}`}>
          {previewImage ? (
            <AvatarImage src={previewImage} alt="profile" />
          ) : (
            <AvatarFallback className="bg-primary text-white">
              {getInitials(nameForInitials)}
            </AvatarFallback>
          )}
        </Avatar>
        <label
          htmlFor="profile-image-input"
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="h-5 w-5 text-white" />
        </label>
        <input id="profile-image-input" type="file" className="hidden" accept="image/*" onChange={handleUpload} />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("profile-image-input")?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
        {previewImage && (
          <Button type="button" variant="outline" size="sm" onClick={() => { setPreviewImage(null); onCropped(null); }}>
            <X className="mr-1 h-4 w-4" /> Remove
          </Button>
        )}
      </div>

      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {imageSrc && (
            <>
              <div className="relative h-64 mb-4 overflow-hidden rounded-lg">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="round"
                  showGrid={false}
                />
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Zoom</Label>
                  <span className="text-xs text-neutral-500">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut className="h-4 w-4 text-neutral-500" />
                  <Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={(v) => setZoom(v[0])} className="flex-1" />
                  <ZoomIn className="h-4 w-4 text-neutral-500" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelCrop}>Cancel</Button>
                <Button type="button" onClick={applyCrop}><Check className="mr-2 h-4 w-4" /> Apply Crop</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
