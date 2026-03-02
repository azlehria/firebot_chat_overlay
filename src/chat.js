const websocketURL = "ws://localhost:7472";
const messageDisplayTime = 600; // Number of seconds to display a chat message before deleting it, set to 0 for permanent messages
const messageFadeOut = true;
const messageNewAtTop = true;
const debug = false;

const replacementFilters = {
  "&": "&amp;",
  "<": "&lt",
  ">": "&gt",
  '"': "&quot;",
  "'": "&#39;",
};

function fade(element) {
  element.style.opacity = Number(
    window.getComputedStyle(element).getPropertyValue("opacity"),
  );
  element.fade_timer = setInterval(function () {
    if (element.style.opacity <= 0.1) {
      clearInterval(element.fade_timer);
      element.remove();
    } else {
      element.style.opacity = element.style.opacity - 0.1;
    }
  }, 50);
}

function timeout_message(chat_msg) {
  // wait for an amount of time before removing
  const timeout_period = messageDisplayTime * 1000;
  const msg_div = document.getElementById(chat_msg.id);
  msg_div.timeout_timer = setTimeout(function () {
    if (messageFadeOut === true) {
      fade(msg_div);
    } else {
      msg_div.remove();
    }
  }, timeout_period);
}

function replace_emotes(chat_msg) {
  let return_str = chat_msg.msg_text;
  const emote_text = chat_msg.emote_names.join(" ");
  const just_emote = emote_text === return_str;
  const emote_class = just_emote ? "emotes-large" : "emotes";
  for (let i = 0; i < chat_msg.emote_names.length; i++) {
    let emote_url = chat_msg.animated_emote_urls[i] || chat_msg.emote_urls[i];
    // Adjust size if only emote, different for each system
    if (emote_url.toLowerCase().includes("7tv.app")) {
      // Fix 7TV Emote defaulting to 4x
      let index = emote_url.indexOf("4x.");
      if (index === -1) {
        index = emote_url.indexOf("1x.");
      }
      emote_url =
        emote_url.slice(0, index) +
        (just_emote ? "2x." : "1x.") +
        emote_url.slice(index + 3);
    } else if (emote_url.toLowerCase().includes("jtvnw.net")) {
      emote_url = emote_url.slice(0, -3) + (just_emote ? "2.0" : "1.0");
    } else if (emote_url.toLowerCase().includes("betterttv.net")) {
      emote_url = emote_url.slice(0, -2) + (just_emote ? "2x" : "1x");
    } else if (emote_url.toLowerCase().includes("frankerfacez.com")) {
      emote_url = emote_url.slice(0, -1) + (just_emote ? "2" : "1");
    }
    let replace_txt = `<img src="${emote_url}" class="${emote_class}">`;
    return_str = return_str.replace(chat_msg.emote_names[i], replace_txt);
  }
  return return_str;
}

function replace_text(chat_msg) {
  let return_str = chat_msg;
  for (const [key, val] of Object.entries(replacementFilters)) {
    return_str = return_str.replace(key, val);
  }
  return return_str;
}

function apply_chat_filters(chat_msg) {
  chat_msg.msg_text = replace_text(chat_msg.msg_text);
  const return_str = replace_emotes(chat_msg);
  return return_str;
}

function add_chat_msg(chat_msg) {
  // Start with getting the overlay
  const overlay = document.getElementById("chat_overlay");
  // Create the overall containing div
  const msg_div = document.createElement("div");
  msg_div.id = chat_msg.id;
  msg_div.className = `chat_message ${chat_msg.id}`;
  const user_div = document.createElement("div");
  user_div.className = "user_details";
  // Add badges
  const badges_div = document.createElement("div");
  badges_div.className = "chat_badges";
  for (const badge_url of chat_msg.badges) {
    const badge_img = document.createElement("img");
    badge_img.src = badge_url;
    badge_img.className = "chat_badges";
    badges_div.append(badge_img);
  }
  user_div.append(badges_div);
  // Add the Username
  const name_p = document.createElement("p");
  name_p.className = "display_name";
  name_p.style = `color:${chat_msg.color}`;
  name_p.append(`${chat_msg["display-name"]}`);
  user_div.append(name_p);
  // Add pronouns
  const pronoun_p = document.createElement("p");
  pronoun_p.className = "pronoun_tag";
  pronoun_p.append(chat_msg.pronouns);
  user_div.append(pronoun_p);
  msg_div.append(user_div);
  // Main message text
  const text_div = document.createElement("div");
  text_div.className = "msg_text";
  const text_p = document.createElement("p");
  let msg_text = apply_chat_filters(chat_msg);
  text_p.className = "msg_text";
  // Format /me actions
  if (msg_text.includes("ACTION")) {
    text_p.classList.add("slash_me");
    msg_text = msg_text.slice(7, -1);
  }
  text_p.innerHTML = msg_text;
  text_div.append(text_p);
  msg_div.append(text_div);
  // Finally add the message to the overlay
  if (messageNewAtTop === true) {
    overlay.insertBefore(msg_div, overlay.firstChild);
  } else {
    overlay.append(msg_div);
  }
}

function clear_timers(element) {
  if (typeof element.timeout_timer === "number") {
    clearTimeout(element.timeout_timer);
  }
  if (typeof element.fade_timer === "number") {
    clearInterval(element.fade_timer);
  }
}

function clear_out_of_bounds() {
  // Clear a message that has gone past the top boundary so we don't have half
  // the characters dangling off the top of the overlay
  const chat_overlay = document.getElementById("chat_overlay");
  while (chat_overlay.getBoundingClientRect().y < 0) {
    console.log(chat_overlay.getBoundingClientRect().y);
    const chat_messages = chat_overlay.getElementsByClassName("chat_message");
    const msg =
      messageNewAtTop === true
        ? chat_messages[chat_messages.length - 1]
        : chat_messages[0];
    clear_timers(msg);
    msg.remove();
  }
}

function delete_user_messages(chat_msg) {
  // Clear all the chat messages, or all message from a user
  // A user has been banned or timed out
  console.log(`Trying to remove messages for ${chat_msg.username}`);
  const remove_chats = [];
  const chats = document.getElementsByClassName("display_name");
  for (const chat of chats) {
    if (chat.textContent === chat_msg.username) {
      remove_chats.push(chat.parentNode.parentNode);
    }
  }
  for (const chat of remove_chats) {
    chat.remove();
  }
}

function clear_chat() {
  const chat_overlay = document.getElementById("chat_overlay");
  const chat_messages = chat_overlay.getElementsByClassName("chat_message");
  for (const chat of chat_messages) {
    clear_timers(chat);
  }
  chat_overlay.replaceChildren();
}

function delete_individual_message(chat_msg) {
  // Find a message and delete it
  document.getElementById(chat_msg.message_id).remove();
}

function msg_handler(msg) {
  // Main message handler function called from the Websockets client
  const ws_msg = JSON.parse(msg.data);
  if (debug === true) {
    console.log("[message] ws_msg received from server:");
    console.log(ws_msg);
  }
  switch (ws_msg.name) {
    case "custom-event:chat_overlay_msg":
      add_chat_msg(ws_msg.data);
      clear_out_of_bounds();
      if (messageDisplayTime > 0) {
        timeout_message(ws_msg.data);
      }
      break;
    case "custom-event:chat_overlay_clear":
      clear_chat();
      break;
    case "custom-event:chat_overlay_clear_user":
      delete_user_messages(ws_msg.data);
      break;
    case "custom-event:chat_overlay_clear_msg":
      // Delete an individual message
      delete_individual_message(ws_msg.data);
      break;
  }
}

function connect() {
  // Connect to the local Websocket server and register the
  // callback functions
  const socket = new WebSocket(websocketURL);
  // Inline function to register and log on open
  socket.onopen = function (e) {
    console.log("[open] Connection established");
    socket.send(
      JSON.stringify({
        type: "invoke",
        id: 1,
        name: "subscribe-events",
        data: [],
      }),
    );
  };
  // Main Message handler function
  socket.onmessage = msg_handler;
  // Inline function to deal with on close events and reconnect if not clean
  socket.onclose = function (event) {
    if (event.wasClean) {
      console.log(`[close] Connection closed cleanly,
                        code=${event.code} reason=${event.reason}`);
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      // Sleep for 5 seconds and try again
      console.log(`[close] Connection died code=${event.code}
                        reason=${event.reason}`);
      setTimeout(function () {
        connect();
      }, 5000);
    }
  };
  // Inline function for logging erros
  socket.onerror = function (error) {
    console.log(`[error] ${error.message}`);
  };
}

function initialize() {
  // Anchor messages to top if set
  if (messageNewAtTop === true) {
    const css_rules = document.styleSheets[0].cssRules;
    for (let i = 0; i < css_rules.length; i++) {
      if (css_rules[i].selectorText === "#chat_overlay") {
        css_rules[i].style.bottom = "";
        css_rules[i].style.top = "10px";
        break;
      }
    }
  }
  connect();
}

initialize();
