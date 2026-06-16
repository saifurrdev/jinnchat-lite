export type ReplyRef = {
  id: string;
  text: string;
  author: "me" | "them";
} | null;

export type Message = {
  id: string;
  text: string;
  mine: boolean;
  ts: number;
  replyTo: ReplyRef;
  myReaction: string | null; // emoji *I* reacted with on this message
  theirReaction: string | null; // emoji the *partner* reacted with on this message
  status: "sending" | "sent" | "read"; // only meaningful for mine
};

export type Partner = {
  username: string;
  image: string | null;
};
