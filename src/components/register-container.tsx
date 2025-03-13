import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface Props {
  children: React.ReactNode;
}

export default function Component(props: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Registrarse</CardTitle>
        <CardDescription>Crea una nueva cuenta para empezar.</CardDescription>
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}
