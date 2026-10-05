import React, { useRef } from "react";

import DotsBackground from "../components/Dotsbackground";
import HomePageSection1 from "../components/HomeSection1";
import HomePageSection2 from "../components/HeroSection2";
import HomePageSection3 from "../components/HomeSection3";
import DotsBackground2 from "../components/DotsBackground2";

const HomePage = () => {
  const pageRef = useRef(null);

  return (
    /* The page owns the background colour. Sections are transparent, so the fixed
       dot canvas (z-0) shows behind all of them. */
    <main ref={pageRef} className="relative w-full bg-white">
      <DotsBackground2 containerRef={pageRef} />
      <HomePageSection1 />
      <HomePageSection2 />
      <HomePageSection3 />
    </main>
  );
};

export default HomePage;