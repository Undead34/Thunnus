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
        <CardTitle className="text-2xl">Inicio de sesión</CardTitle>
        <CardDescription>
          Introduzca su dirección de correo electrónico para acceder a su cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}
