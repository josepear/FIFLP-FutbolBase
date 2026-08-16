// ============================================================
// Avatar: foto real o ilustración DiceBear como fallback
// ============================================================

interface Props {
  name: string;
  photoUrl?: string;
  size?: number;
  className?: string;
  square?: boolean;
}

export function Avatar({ name, photoUrl, size = 40, className = '', square = false }: Props) {
  const fallbackUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`;
  const src = photoUrl || fallbackUrl;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`${square ? 'rounded-none' : 'rounded-full'} object-cover bg-blue-50 shrink-0 ${className}`}
      loading="lazy"
      onError={(e) => {
        // Si la foto falla, usar fallback
        (e.target as HTMLImageElement).src = fallbackUrl;
      }}
    />
  );
}
