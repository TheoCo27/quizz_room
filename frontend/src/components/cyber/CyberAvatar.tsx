import Avatar from "../Avatar";

type CyberAvatarProps = {
    username: string;
    avatarUrl: string | null;
    status?: "online" | "offline";
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    showStatus?: boolean;
    alt?: string;
    fallbackClassName?: string;
};

const sizeClasses: Record<NonNullable<CyberAvatarProps["size"]>, string> = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
};

const fallbackSizes: Record<NonNullable<CyberAvatarProps["size"]>, string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
    xl: "text-3xl",
};

export default function CyberAvatar({
    username,
    avatarUrl,
    status = "offline",
    size = "md",
    className = "",
    showStatus = true,
    alt,
    fallbackClassName,
}: CyberAvatarProps) {
    return (
        <div
            className={`cyber-avatar ${sizeClasses[size]} ${className}`.trim()}
            data-status={status}
        >
            <Avatar
                alt={alt}
                avatarUrl={avatarUrl}
                className="h-full w-full"
                fallbackClassName={fallbackClassName ?? fallbackSizes[size]}
                username={username}
            />
            {showStatus ? <span aria-hidden="true" className="cyber-avatar__status" /> : null}
        </div>
    );
}
