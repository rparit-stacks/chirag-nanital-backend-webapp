import { useState, FC } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { LogIn, TruckElectric, User } from "lucide-react";
import { MyButton } from "../custom/MyButton";
import RegisterModal from "./RegisterModal";
import GoogleLoginBtn from "../Functional/GoogleLoginBtn";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";

interface LoginModalProps {
  triggerView?: "btn" | "link" | "icon";
}

export const LoginModal: FC<LoginModalProps> = ({ triggerView = "btn" }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      {/* Trigger Button */}
      {triggerView === "btn" ? (
        <MyButton
          id="login-btn"
          color="primary"
          onPress={onOpen}
          startContent={<LogIn size={16} />}
          size="responsive"
          variant="flat"
          className="p-0 text-xs"
        >
          {t("login_modal.button")}
        </MyButton>
      ) : triggerView === "icon" ? (
        <Button
          id="login-btn"
          size="sm"
          onPress={onOpen}
          isIconOnly
          className="p-0 rounded-full bg-transparent text-foreground/50 hover:text-foreground/70"
        >
          <User size={20} />
        </Button>
      ) : (
        <div
          className="text-primary-600 text-md underline cursor-pointer"
          onClick={onOpen}
          id="login-btn"
        >
          {t("login_modal.button")}
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        backdrop="blur"
        size="sm"
        classNames={{
          base: "rounded-2xl",
          header: "border-b border-divider",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <TruckElectric className="text-primary" size={24} />
                  <h2 className="font-semibold">
                    {t("login_modal.welcome_title")}
                  </h2>
                </div>
                <p className="text-sm text-default-500">
                  {t("login_modal.welcome_subtitle")}
                </p>
              </ModalHeader>

              <ModalBody className="py-8 flex flex-col items-center gap-4">
                <p className="text-sm text-center text-default-500 max-w-xs">
                  Sign in with your Google account to continue. New users will be
                  prompted to complete their profile.
                </p>
                <div className="w-full">
                  <GoogleLoginBtn
                    isLoading={isLoading}
                    onOpenChange={onOpenChange}
                    setIsLoading={setIsLoading}
                    context="login"
                  />
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <RegisterModal />
    </>
  );
};

export default LoginModal;
