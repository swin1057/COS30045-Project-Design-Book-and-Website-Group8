import { createApp } from "vue";
import { createVuetify } from "vuetify";
import "vuetify/styles";
import "./styles/dashboard.css";
import App from "./App.vue";

const vuetify = createVuetify({
  theme: {
    defaultTheme: "dashboardLight",
    themes: {
      dashboardLight: {
        dark: false,
        colors: {
          primary: "#111111",
          secondary: "#5c5c5c",
          surface: "#ffffff",
          background: "#f5f5f5",
          error: "#8b1e1e",
          info: "#404040",
          success: "#2f2f2f",
          warning: "#666666"
        }
      }
    }
  },
  defaults: {
    VCard: {
      elevation: 0,
      rounded: "lg"
    },
    VBtn: {
      rounded: "lg",
      elevation: 0
    },
    VSelect: {
      variant: "outlined",
      density: "comfortable",
      hideDetails: true
    }
  }
});

createApp(App).use(vuetify).mount("#app");
