import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";
import { getUserFacingErrorMessage } from "../utils/errorMessages";

/** GET /api/chat/conversations – list my conversations (patient: with doctors). */
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axiosInstance.get("/api/chat/conversations");
      const body = response.data ?? {};
      const data = body.data ?? body;
      const list = Array.isArray(data)
        ? data
        : (data?.conversations ?? []);
      return list;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron cargar las conversaciones." : "Could not load conversations.",
        ),
      );
    }
  }
);

/** POST /api/chat/conversations – get or create. Body: { doctorId } (patient inferred from auth). */
export const getOrCreateConversation = createAsyncThunk(
  "chat/getOrCreateConversation",
  async ({ doctorId, patientId }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const payload = { doctorId };
      if (patientId != null) payload.patientId = patientId;
      const response = await axiosInstance.post("/api/chat/conversations", payload);
      const body = response.data ?? {};
      const data = body.data ?? body;
      return data ?? null;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo iniciar la conversación." : "Could not start the conversation.",
        ),
      );
    }
  }
);

/** PATCH /api/chat/conversations/:conversationId/read – mark as read for current user. */
export const markConversationReadAPI = createAsyncThunk(
  "chat/markConversationRead",
  async (conversationId, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      await axiosInstance.patch(`/api/chat/conversations/${conversationId}/read`);
      return conversationId;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo marcar la conversación como leída." : "Could not mark conversation as read.",
        ),
      );
    }
  }
);

/** GET /api/chat/conversations/:conversationId/messages?page=1&limit=50. merge: true = merge into existing list (fallback poll). */
export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ conversationId, page = 1, limit = 50, merge = false }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const response = await axiosInstance.get(
        `/api/chat/conversations/${conversationId}/messages?${params}`
      );
      const body = response.data ?? {};
      const data = body.data ?? body;
      const list = data?.messages ?? (Array.isArray(data) ? data : []);
      return {
        conversationId,
        messages: Array.isArray(list) ? list : [],
        page,
        total: body.total ?? (Array.isArray(list) ? list.length : 0),
        merge,
      };
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudieron cargar los mensajes." : "Could not load messages.",
        ),
      );
    }
  }
);

/** POST /api/chat/conversations/:conversationId/messages – body: { body: "text" } */
export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, body: text }, { rejectWithValue, getState }) => {
    const language = getState()?.language?.language || "es";
    try {
      const response = await axiosInstance.post(
        `/api/chat/conversations/${conversationId}/messages`,
        { body: text }
      );
      const resBody = response.data ?? {};
      const data = resBody.data ?? resBody;
      const message = data?.message ?? data;
      return message ?? null;
    } catch (err) {
      return rejectWithValue(
        getUserFacingErrorMessage(
          err,
          language,
          language === "es" ? "No se pudo enviar el mensaje." : "Could not send the message.",
        ),
      );
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    conversations: [],
    currentConversation: null,
    messagesByConversation: {},
    loading: {
      conversations: false,
      conversation: false,
      messages: false,
      send: false,
    },
    error: {
      conversations: null,
      conversation: null,
      messages: null,
      send: null,
    },
  },
  reducers: {
    clearCurrentConversation: (state) => {
      state.currentConversation = null;
    },
    clearMessagesError: (state) => {
      state.error.messages = null;
    },
    clearSendError: (state) => {
      state.error.send = null;
    },
    appendMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      state.messagesByConversation[conversationId].unshift(message);
    },
    markConversationRead: (state, action) => {
      const conversationId = action.payload;
      if (conversationId && Array.isArray(state.conversations)) {
        const idx = state.conversations.findIndex((c) => c._id === conversationId);
        if (idx >= 0) state.conversations[idx].unreadCount = 0;
      }
    },
    /** Socket: new message (append, dedupe; update conversation list). */
    socketNewMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!conversationId || !message?._id) return;
      const list = state.messagesByConversation[conversationId] ?? [];
      if (list.some((m) => m._id === message._id)) return;
      state.messagesByConversation[conversationId] = [...list, message];
      const isOpen = state.currentConversation?._id === conversationId;
      if (!Array.isArray(state.conversations)) return;
      const convIdx = state.conversations.findIndex((c) => c._id === conversationId);
      if (convIdx >= 0) {
        const c = state.conversations[convIdx];
        state.conversations[convIdx] = {
          ...c,
          lastMessage: { body: message.body, createdAt: message.createdAt },
          updatedAt: message.createdAt,
          unreadCount: isOpen ? 0 : (c.unreadCount ?? 0) + 1,
        };
        state.conversations.sort(
          (a, b) =>
            new Date(b.updatedAt || b.lastMessage?.createdAt || 0) -
            new Date(a.updatedAt || a.lastMessage?.createdAt || 0)
        );
      }
    },
    /** Socket: other party marked conversation as read. */
    socketMessageRead: (state, action) => {
      const conversationId = typeof action.payload === "object" ? action.payload?.conversationId : action.payload;
      if (conversationId && Array.isArray(state.conversations)) {
        const idx = state.conversations.findIndex((c) => c._id === conversationId);
        if (idx >= 0) state.conversations[idx].unreadCount = 0;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading.conversations = true;
        state.error.conversations = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading.conversations = false;
        state.conversations = action.payload ?? [];
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading.conversations = false;
        state.error.conversations = action.payload;
      })
      .addCase(getOrCreateConversation.pending, (state) => {
        state.loading.conversation = true;
        state.error.conversation = null;
      })
      .addCase(getOrCreateConversation.fulfilled, (state, action) => {
        state.loading.conversation = false;
        const conv = action.payload ?? null;
        state.currentConversation = conv;
        if (conv?._id && Array.isArray(state.conversations)) {
          const idx = state.conversations.findIndex((c) => c._id === conv._id);
          if (idx >= 0) {
            state.conversations[idx] = conv;
          } else {
            state.conversations = [conv, ...state.conversations];
          }
        }
      })
      .addCase(getOrCreateConversation.rejected, (state, action) => {
        state.loading.conversation = false;
        state.error.conversation = action.payload;
      })
      .addCase(fetchMessages.pending, (state) => {
        state.loading.messages = true;
        state.error.messages = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading.messages = false;
        const { conversationId, messages: incoming, merge } = action.payload ?? {};
        if (!conversationId) return;
        const list = incoming ?? [];
        if (merge) {
          const existing = state.messagesByConversation[conversationId] ?? [];
          const existingIds = new Set(existing.map((m) => m._id));
          const newOnes = list.filter((m) => m._id && !existingIds.has(m._id));
          if (newOnes.length === 0) return;
          const merged = [...existing, ...newOnes].sort(
            (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
          );
          state.messagesByConversation[conversationId] = merged;
        } else {
          state.messagesByConversation[conversationId] = list;
        }
        const idx = state.conversations.findIndex((c) => c._id === conversationId);
        if (idx >= 0) state.conversations[idx].unreadCount = 0;
      })
      .addCase(markConversationReadAPI.fulfilled, (state, action) => {
        const conversationId = action.payload;
        if (conversationId && Array.isArray(state.conversations)) {
          const idx = state.conversations.findIndex((c) => c._id === conversationId);
          if (idx >= 0) state.conversations[idx].unreadCount = 0;
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading.messages = false;
        state.error.messages = action.payload;
      })
      .addCase(sendMessage.pending, (state) => {
        state.loading.send = true;
        state.error.send = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading.send = false;
        const message = action.payload;
        if (!message?._id) return;
        const argId = action.meta?.arg?.conversationId;
        const cid =
          (typeof message.conversation === "object" && message.conversation?._id) ||
          (typeof message.conversation === "string" && message.conversation) ||
          argId ||
          state.currentConversation?._id;
        if (cid) {
          const list = state.messagesByConversation[cid] ?? [];
          if (list.some((m) => m._id === message._id)) return;
          state.messagesByConversation[cid] = [...list, message];
          if (Array.isArray(state.conversations)) {
            const convIdx = state.conversations.findIndex((c) => c._id === cid);
            if (convIdx >= 0) {
              const c = state.conversations[convIdx];
              state.conversations[convIdx] = {
                ...c,
                lastMessage: { body: message.body, createdAt: message.createdAt },
                updatedAt: message.createdAt,
              };
              state.conversations.sort(
                (a, b) =>
                  new Date(b.updatedAt || b.lastMessage?.createdAt || 0) -
                  new Date(a.updatedAt || a.lastMessage?.createdAt || 0)
              );
            }
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading.send = false;
        state.error.send = action.payload;
      });
  },
});

export const {
  clearCurrentConversation,
  clearMessagesError,
  clearSendError,
  appendMessage,
  markConversationRead,
  socketNewMessage,
  socketMessageRead,
} = chatSlice.actions;

/** Thunk for socket chat:newMessage: dispatch socketNewMessage; if conversation not in list, refresh; if open, mark as read. */
export const handleSocketNewMessage = (payload) => (dispatch, getState) => {
  const { conversationId, message } = payload ?? {};
  if (!conversationId || !message) return;
  const state = getState().chat;
  const inList = (state.conversations ?? []).some((c) => c._id === conversationId);
  if (!inList) dispatch(fetchConversations());
  dispatch(socketNewMessage({ conversationId, message }));
  if (state.currentConversation?._id === conversationId) {
    dispatch(markConversationReadAPI(conversationId));
  }
};

/** True if any conversation has unreadCount > 0 (for tab bar badge). */
export const selectHasUnreadMessages = (state) => {
  const conversations = state.chat.conversations;
  if (!Array.isArray(conversations)) return false;
  return conversations.some((c) => (c?.unreadCount ?? 0) > 0);
};
export default chatSlice.reducer;
