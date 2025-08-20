import * as React from "react";
import GachaClient from "./GachaClient";

export default function GachaPage({ params }) {
  const { gachaId: raw } = React.use(params);  // unwrap here
  const id = raw.startsWith("gacha_") ? raw.slice("gacha_".length) : raw;
  return <GachaClient id={id} />;
}
