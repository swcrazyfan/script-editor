<template>
  <div class="editor-container">
    <q-header class="bg-white text-dark">
      <q-toolbar>
        <q-btn-dropdown flat no-caps>
          <template #label>
            <q-icon name="description" size="sm" class="q-mr-xs" />
            File
          </template>
          <q-list>
            <q-item clickable v-close-popup @click="handleNew">
              <q-item-section>New Script</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-space />

        <q-btn-dropdown
          :label="currentBlockType.toLowerCase().replace('_', ' ')"
          class="text-capitalize"
          flat
          no-caps
        >
          <q-list>
            <q-item
              v-for="(format, type) in FORMATS"
              :key="type"
              clickable
              v-close-popup
              @click="changeBlockType(type)"
              :active="currentBlockType === type"
            >
              <q-item-section>
                {{ type.toLowerCase().replace("_", " ") }}
              </q-item-section>
              <q-item-section side> Ctrl+{{ format.shortcut }} </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-space />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <div class="editor-scroll-area q-pa-md">
        <div class="editor-page-container q-mx-auto q-my-lg">
          <q-card flat class="editor-page">
            <q-card-section>
              <div class="page-number">1.</div>
              <editor-content :editor="editor" @keydown="handleKeyDown" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-page-container>

    <q-footer class="bg-white text-dark">
      <q-toolbar>
        <div class="text-caption q-mr-md">
          Enter for next element, Shift+Enter for new line
        </div>
        <q-space />
        <q-btn flat dense icon="undo" @click="undo" :disable="!canUndo" />
        <q-btn flat dense icon="redo" @click="redo" :disable="!canRedo" />
      </q-toolbar>
    </q-footer>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";

const FORMATS = {
  SCENE_HEADING: {
    className: "text-center uppercase font-bold",
    nextElement: "STAGE_DIRECTION",
    nextTab: "CHARACTER",
    shortcut: "1",
  },
  STAGE_DIRECTION: {
    className: "stage-direction italic",
    nextElement: "CHARACTER",
    nextTab: "CHARACTER",
    shortcut: "2",
  },
  CHARACTER: {
    className: "text-center uppercase",
    nextElement: "DIALOGUE",
    nextTab: "PARENTHETICAL",
    shortcut: "3",
  },
  PARENTHETICAL: {
    className: "parenthetical italic",
    nextElement: "DIALOGUE",
    nextTab: "DIALOGUE",
    shortcut: "4",
  },
  DIALOGUE: {
    className: "dialogue",
    nextElement: "CHARACTER",
    nextTab: "PARENTHETICAL",
    shortcut: "5",
  },
  TRANSITION: {
    className: "text-right uppercase",
    nextElement: "SCENE_HEADING",
    nextTab: "SCENE_HEADING",
    shortcut: "6",
  },
  SONG_HEADING: {
    className: "song-heading text-center uppercase font-bold",
    nextElement: "LYRIC",
    nextTab: "LYRIC",
    shortcut: "7",
  },
  LYRIC: {
    className: "lyric",
    nextElement: "LYRIC",
    nextTab: "MUSICAL_DIRECTION",
    shortcut: "8",
  },
  MUSICAL_DIRECTION: {
    className: "musical-direction italic",
    nextElement: "LYRIC",
    nextTab: "LYRIC",
    shortcut: "9",
  },
};

const currentBlockType = ref("SCENE_HEADING");

// Computed properties
const canUndo = computed(() => editor.value?.can().undo() ?? false);
const canRedo = computed(() => editor.value?.can().redo() ?? false);

// Parenthetical validation function
const validateParenthetical = (text) => {
  if (!text) return "()";

  let trimmed = text.trim();
  if (!trimmed) return "()";

  if (!trimmed.startsWith("(")) {
    trimmed = "(" + trimmed;
  }

  if (!trimmed.endsWith(")")) {
    trimmed = trimmed + ")";
  }

  return trimmed;
};

// Custom TipTap extensions
const CustomDocument = Document.extend({
  content: "block+",
});

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      blockType: {
        default: "SCENE_HEADING",
        parseHTML: (element) => element.getAttribute("data-block-type"),
        renderHTML: (attributes) => {
          const format = FORMATS[attributes.blockType];
          if (!format) return {};

          return {
            "data-block-type": attributes.blockType,
            class: format.className,
          };
        },
        keepOnSplit: false,
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
    };
  },
});

// Initialize editor
const editor = useEditor({
  extensions: [
    CustomDocument,
    CustomParagraph.configure({
      HTMLAttributes: {
        class: "editor-paragraph",
      },
    }),
    Text,
    StarterKit.configure({
      document: false,
      paragraph: false,
    }),
  ],
  content:
    '<p data-block-type="SCENE_HEADING" class="text-center uppercase font-bold"></p>',
  onUpdate: ({ editor }) => {
    const node = editor.state.selection.$head.parent;
    const type = node.attrs.blockType;
    if (type && type !== currentBlockType.value) {
      currentBlockType.value = type;
    }
  },
});

// Methods
const changeBlockType = (type) => {
  if (!editor.value || !FORMATS[type]) return;

  // Get current node and its text before changing type
  const node = editor.value.state.selection.$head.parent;
  let text = node.textContent;

  // Update the block type
  editor.value.commands.setNode("paragraph", { blockType: type });

  // If switching to parenthetical, validate/add parentheses
  if (type === "PARENTHETICAL") {
    const validatedText = validateParenthetical(text);
    if (validatedText !== text) {
      editor.value
        .chain()
        .setTextSelection({
          from: node.pos + 1,
          to: node.pos + node.nodeSize - 1,
        })
        .insertContent(validatedText)
        .run();
    }
  }

  currentBlockType.value = type;
};

const handleKeyDown = (e) => {
  if (!editor.value) return;

  if (e.key === "Enter") {
    e.preventDefault();

    if (e.shiftKey) {
      editor.value.chain().focus().insertContent("\n").run();
      return;
    }

    const node = editor.value.state.selection.$head.parent;
    const isEmpty = !node.textContent.trim();
    const currentType = currentBlockType.value;

    // Handle empty blocks
    if (isEmpty) {
      switch (currentType) {
        case "CHARACTER":
          changeBlockType("STAGE_DIRECTION");
          return;
        case "DIALOGUE":
          changeBlockType("CHARACTER");
          return;
        case "LYRIC":
          changeBlockType("SONG_HEADING");
          return;
      }
    }

    // If we're in a PARENTHETICAL block, validate parentheses before moving on
    if (currentType === "PARENTHETICAL") {
      const validatedText = validateParenthetical(node.textContent);
      if (validatedText !== node.textContent) {
        editor.value
          .chain()
          .setTextSelection({
            from: node.pos + 1,
            to: node.pos + node.nodeSize - 1,
          })
          .insertContent(validatedText)
          .run();
      }
    }

    // Get next block type
    const nextType = FORMATS[currentType].nextElement;

    // First split the block
    editor.value.commands.splitBlock();

    // Then immediately set the new block type
    editor.value.commands.setNode("paragraph", { blockType: nextType });

    // Update the current block type
    currentBlockType.value = nextType;
  } else if (e.key === "Tab") {
    e.preventDefault();
    const types = Object.keys(FORMATS);
    const nextType =
      types[(types.indexOf(currentBlockType.value) + 1) % types.length];
    changeBlockType(nextType);
  } else if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    const type = Object.keys(FORMATS)[parseInt(e.key) - 1];
    if (type) changeBlockType(type);
  }
};

const handleNew = () => {
  editor.value
    ?.chain()
    .clearContent()
    .setNode("paragraph", { blockType: "SCENE_HEADING" })
    .focus()
    .run();
  currentBlockType.value = "SCENE_HEADING";
};

const undo = () => editor.value?.chain().focus().undo().run();
const redo = () => editor.value?.chain().focus().redo().run();

// Watch for changes in currentBlockType
watch(currentBlockType, (newType) => {
  if (editor.value && newType) {
    const node = editor.value.state.selection.$head.parent;
    if (node.attrs.blockType !== newType) {
      editor.value
        .chain()
        .focus()
        .setNode("paragraph", { blockType: newType })
        .updateAttributes("paragraph", { blockType: newType })
        .run();
    }
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style lang="scss">
.editor-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-scroll-area {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
}

.editor-page-container {
  max-width: 8.5in;
  margin: 2rem auto;
}

.editor-page {
  min-height: 11in;
  background: white;
  position: relative;
}

.page-number {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: #666;
}

.ProseMirror {
  font-family: "Courier New", Courier, monospace;
  font-size: 12pt;
  line-height: 1.5;
  padding: 1rem;
  outline: none;
  min-height: calc(11in - 2rem);

  p {
    margin: 0;
    padding: 0;
    position: relative;

    &[data-block-type="SCENE_HEADING"] {
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }

    &[data-block-type="CHARACTER"] {
      margin-top: 0.5rem;
      margin-bottom: 0;
    }

    &[data-block-type="DIALOGUE"] {
      margin-bottom: 0.25rem;
    }

    &[data-block-type="SONG_HEADING"] {
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }

    &[data-block-type="LYRIC"] {
      margin-left: 1.5in;
      margin-right: 1.5in;
      margin-top: 0;
      margin-bottom: 0;
    }

    &[data-block-type="MUSICAL_DIRECTION"] {
      margin-left: 1in;
      margin-top: 0.25rem;
      margin-bottom: 0.25rem;
      font-style: italic;
    }

    &[data-block-type="SCENE_HEADING"],
    &[data-block-type="CHARACTER"],
    &[data-block-type="TRANSITION"],
    &[data-block-type="SONG_HEADING"] {
      text-transform: uppercase;
    }
  }

  .dialogue {
    margin-left: 1.5in;
    margin-right: 1in;
  }

  .stage-direction {
    margin-left: 1.2in;
    margin-right: 1.2in;
  }

  .parenthetical {
    margin-left: 1.2in;
    margin-right: 1.9in;
  }
}

.editor-scroll-area::-webkit-scrollbar {
  width: 8px;
}

.editor-scroll-area::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.editor-scroll-area::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}

.q-menu {
  background: white;
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 9999;

  .q-item {
    min-height: 32px;
    font-family: "Courier New", Courier, monospace;
    font-size: 12pt;
    padding: 4px 8px;

    &:hover {
      background: #f5f5f5;
    }
  }

  .q-item-section {
    color: #333;
    text-transform: uppercase;
  }
}
</style>
