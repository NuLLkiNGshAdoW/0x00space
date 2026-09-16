import { Youtube, Send, MessageCircle, Users } from "lucide-react";

/**
 * Ссылки на соцсети канала. Вынесены в один конфиг, чтобы Navbar и Footer
 * не расходились, если ссылка когда-нибудь поменяется.
 */
export const SOCIAL_LINKS = [
  { name: "YouTube", href: "https://youtube.com/@0x00space", icon: Youtube },
  { name: "Telegram-канал", href: "https://t.me/space_0x00", icon: Send },
  { name: "Discord", href: "https://discord.gg/0x00space", icon: MessageCircle },
  { name: "VK", href: "https://vk.com/0x00space", icon: Users },
];
