import React from "react";
import { panelStyle } from "../styles";


type Props = {
title: string;
right?: React.ReactNode;
children: React.ReactNode;
};


export default function Section({ title, right, children }: Props) {
return (
<div style={{ ...panelStyle }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
<h3 style={{ margin: 0, fontSize: 16, color: "#f9fafb" }}>{title}</h3>
<div style={{ display: "flex", gap: 8 }}>{right}</div>
</div>
{children}
</div>
);
}