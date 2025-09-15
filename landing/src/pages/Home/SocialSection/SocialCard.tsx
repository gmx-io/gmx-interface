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
      className="duration-180 group relative flex h-[320px] w-[280px] flex-shrink-0 cursor-pointer flex-col gap-16 overflow-hidden rounded-16 bg-slate-800 p-16 transition-transform hover:z-20 hover:-translate-y-4 sm:h-[440px] sm:w-[420px] sm:p-20"
    >
      <div className="flex flex-row items-start justify-between">
        <div className="flex flex-row items-center gap-12">
          <div className="rounded-full">
            <img src={avatarUrl} className="size-36 object-cover sm:size-44" alt="Avatar" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-2 text-14 font-medium tracking-[0.032px] sm:text-16">
              {author}
              <IcSocialCheckmark className="size-16" />
            </div>
            <span className="text-[11px] font-medium tracking-[0.024px] text-slate-500 sm:text-12">@{username}</span>
          </div>
        </div>
        <div className="duration-180 rounded-8 bg-slate-700 p-12 text-slate-500 transition-colors group-hover:bg-blue-400 group-hover:text-white">
          <IcLinkArrow className="size-8" />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-16 overflow-hidden text-[11px] font-normal leading-[14px] -tracking-[0.448px] sm:text-14 sm:leading-[20px]">
        {children}
      </div>
      <span className="text-[11px] font-medium tracking-[0.024px] text-slate-500 sm:text-12">{date}</span>
    </div>
  );
}
