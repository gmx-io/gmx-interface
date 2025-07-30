import { useCallback } from "react";

import IcLinkArrow from "img/ic_link_arrow.svg?react";
import IcSocialCheckmark from "img/ic_social_checkmark.svg?react";

type Props = {
  author: string;
  avatarUrl: string;
  postLink: string;
  username: string;
  children: React.ReactNode;
  date: string;
};

export function SocialCard({ author, avatarUrl, date, postLink, username, children }: Props) {
  const onClick = useCallback(() => {
    window.open(postLink, "_blank");
  }, [postLink]);
  return (
    <div
      onClick={onClick}
      className="bg-fiord-600 group flex h-[440px] w-[420px] flex-shrink-0 cursor-pointer flex-col gap-16 overflow-hidden rounded-16 p-20"
    >
      <div className="flex flex-row items-start justify-between">
        <div className="flex flex-row items-center gap-12">
          <div className="rounded-full">
            <img src={avatarUrl} className="size-44 object-cover" alt="Avatar" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-2 text-16 font-medium tracking-[0.032px]">
              {author}
              <IcSocialCheckmark className="size-16" />
            </div>
            <span className="text-12 font-medium tracking-[0.024px] text-slate-100">@{username}</span>
          </div>
        </div>
        <div className="rounded-8 bg-[#1E2033] p-12 text-slate-100 group-hover:bg-blue-600 group-hover:text-white">
          <IcLinkArrow className="size-8" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between text-[14px] font-normal leading-[20px] -tracking-[0.448px]">
        {children}
      </div>
      <span className="text-12 font-medium tracking-[0.024px] text-slate-100">{date}</span>
    </div>
  );
}
