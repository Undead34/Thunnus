import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";

export const InputPassword = ({ value }: { value: string }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex w-full max-w-sm items-center">
      <Input
        className="border-none shadow-none"
        disabled
        type={showPassword ? "text" : "password"}
        value={value}
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeClosed className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
