"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

const GogIconsBanner: React.FC = () => {
  const [icons, setIcons] = useState<string[]>([]);

  useEffect(() => {
    // List of icon filenames from the GOG folder
    const iconFiles = [
      "american.png",
      "atlet.png",
      "baseball.png",
      "basketball.png",
      "bicycle.png",
      "bowling.png",
      "box.png",
      "car.png",
      "console.png",
      "dive.png",
      "football-01.png",
      "football.png",
      "golfball.png",
      "gymnastic.png",
      "handball.png",
      "horse.png",
      "ice.png",
      "kayaking.png",
      "kick.png",
      "kite.png",
      "like.png",
      "Logo.png",
      "logout.png",
      "LogoWithoutText.png",
      "motor.png",
      "parachute.png",
      "people.png adlı dosyanın kopyası.png",
      "shooting.png",
      "skate.png",
      "ski.png",
      "snooker.png",
      "snowboard.png",
      "surf.png",
      "swim.png",
      "tenis.png",
      "volleyball.png",
      "waterpolo.png",
      "weight.png",
      "wrestling.png",
      "yoga.png",
    ];

    setIcons(iconFiles);
  }, []);

  if (icons.length === 0) return null;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 py-2">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {icons.map((icon, index) => (
            <div
              key={index}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 hover:scale-110 transition-transform duration-200 flex-shrink-0"
            >
              <Image
                src={`/gog-icons/${icon}`}
                alt={icon.replace(".png", "")}
                width={32}
                height={32}
                className="object-contain w-full h-full brightness-0 dark:brightness-0 dark:invert transition-all duration-200"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GogIconsBanner;

