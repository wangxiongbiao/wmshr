import { useState, useRef, useEffect } from "react";

interface UseCanvasSignatureOptions {
  isOpen: boolean;
  initialSignature: string;
  onSave: (signatureDataUrl: string) => void;
  onClose: () => void;
}

export function useCanvasSignature({
  isOpen,
  initialSignature,
  onSave,
  onClose,
}: UseCanvasSignatureOptions) {
  const [sigColor, setSigColor] = useState("#1e3a8a");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pre-load current signature onto modal canvas when opened
  useEffect(() => {
    if (isOpen && initialSignature) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = initialSignature;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.strokeStyle = sigColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = buffer.data;
    let hasContent = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        hasContent = true;
        break;
      }
    }

    if (hasContent) {
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    } else {
      onSave("");
    }
    onClose();
  };

  return {
    canvasRef,
    sigColor,
    setSigColor,
    isDrawing,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    saveSignature,
  };
}
