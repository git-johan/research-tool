interface PersonaAvatarProps {
  name: string;
  color: string;
  avatarImage?: string;
  size?: "small" | "medium" | "large";
}

export function PersonaAvatar({ name, color, avatarImage, size = "medium" }: PersonaAvatarProps) {
  // Get initials from first and last name
  const getInitials = (fullName: string) => {
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      // First and last name initials
      return nameParts[0].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    } else {
      // Just first name initial
      return nameParts[0].charAt(0).toUpperCase();
    }
  };

  const initials = getInitials(name);

  const sizeClasses = {
    small: "w-6 h-6 text-xs",
    medium: "w-8 h-8 text-sm",
    large: "w-12 h-12 text-lg",
  };

  if (avatarImage) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0`}>
        <img
          src={avatarImage}
          alt={`${name}'s avatar`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
