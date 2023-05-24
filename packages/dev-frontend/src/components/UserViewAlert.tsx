import React from "react";
import { Alert, Heading, Text } from "theme-ui";
import { Icon } from "./Icon";

type UserViewAlertProps = {
    onClose: (event: React.MouseEvent<HTMLElement>) => void;
};
export const UserViewAlert: React.FC<UserViewAlertProps> = ({ onClose }) => {
  return (
    <Alert
      sx={{
        position: "absolute",
        width: "35%",
        top: 0,
        left: 0,
        right: 0,
        m: "auto",
        p: 3,
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        alignItems: "flex-start",
        backgroundColor: 'secondaryHover',
        color: 'black',
        zIndex: "1"
      }}
    >
      <Heading
        as="h3"
        sx={{ width: "100%", display: "flex", justifyContent: "space-between", mb: 1, mr: 2 }}
      >
        Information
        <span style={{ marginLeft: "auto", cursor: "pointer" }} onClick={(e) => onClose(e)}>
          <Icon name="window-close" size={"1x"} color="white" />
        </span>
      </Heading>
      <Heading as="h4" sx={{ mb: 2 }}>
        <Text variant="normalBold">Please Connect with wallet to View Your Vault Stats!</Text>
      </Heading>
    </Alert>
  );
};