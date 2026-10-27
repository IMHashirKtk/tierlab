"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";

const PublishModal = dynamic(() => import("@/components/PublishModal").then(module => module.PublishModal), {
  ssr: false,
});

export function HomeHeader() {
  const [isPublishing, setIsPublishing] = useState(false);
  return <>
    <Navbar onOpenPublish={() => setIsPublishing(true)} />
    {isPublishing && <PublishModal isOpen onClose={() => setIsPublishing(false)} />}
  </>;
}
