<template>
  <div class="editor-container">
    <q-header class="bg-white text-dark">
      <q-toolbar>
        <q-btn-dropdown flat no-caps>
          <template #label>
            <q-icon name="description" size="sm" class="q-mr-xs" />
            File
          </template>
          <q-list> </q-list>
        </q-btn-dropdown>

        <!-- Text Formatting -->
        <div class="q-gutter-sm q-ml-md">
          <q-btn
            v-for="(tool, key) in textTools"
            :key="key"
            flat
            dense
            size="sm"
            :icon="tool.icon"
            :class="{ 'text-primary': editor?.isActive(tool.command) }"
            @click="tool.action"
          >
            <q-tooltip
              >{{ tool.label }} ({{ modifierKey }}+{{
                tool.shortcut
              }})</q-tooltip
            >
          </q-btn>
        </div>

        <q-separator vertical inset class="q-mx-sm" />

        <!-- Alignment -->
        <div class="q-gutter-sm print:hidden">
          <q-btn
            v-for="(align, key) in alignTools"
            :key="key"
            flat
            dense
            size="sm"
            :icon="align.icon"
            :class="{
              'text-primary': editor?.isActive({ textAlign: align.value }),
            }"
            @click="align.action"
          >
            <q-tooltip
              >{{ align.label }} ({{ modifierKey }}+{{
                align.shortcut
              }})</q-tooltip
            >
          </q-btn>
        </div>

        <q-separator vertical inset class="q-mx-sm" />

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
              <q-item-section side
                >{{ modifierKey }}+{{ format.shortcut }}</q-item-section
              >
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
        <q-btn flat dense icon="undo" @click="undo" :disable="!canUndo">
          <q-tooltip>Undo ({{ modifierKey }}+Z)</q-tooltip>
        </q-btn>
        <q-btn flat dense icon="redo" @click="redo" :disable="!canRedo">
          <q-tooltip>Redo ({{ modifierKey }}+Shift+Z)</q-tooltip>
        </q-btn>
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
import TextAlign from "@tiptap/extension-text-align";

// Platform detection
const isMac =
  typeof navigator !== "undefined"
    ? /Mac|iPod|iPhone|iPad/.test(navigator?.userAgent)
    : false;
const modifierKey = isMac ? "⌘" : "Ctrl";
const modifierEvent = isMac ? "metaKey" : "ctrlKey";

// Text formatting tools configuration
const textTools = ref({
  bold: {
    icon: "format_bold",
    command: "bold",
    label: "Bold",
    shortcut: "B",
    action: () => editor.value?.chain().focus().toggleBold().run(),
  },
  italic: {
    icon: "format_italic",
    command: "italic",
    label: "Italic",
    shortcut: "I",
    action: () => editor.value?.chain().focus().toggleItalic().run(),
  },
  strike: {
    icon: "format_strikethrough",
    command: "strike",
    label: "Strikethrough",
    shortcut: "S",
    action: () => editor.value?.chain().focus().toggleStrike().run(),
  },
});

// Alignment tools configuration
const alignTools = ref({
  left: {
    icon: "format_align_left",
    value: "left",
    label: "Align Left",
    shortcut: "L",
    action: () => editor.value?.chain().focus().setTextAlign("left").run(),
  },
  center: {
    icon: "format_align_center",
    value: "center",
    label: "Center",
    shortcut: "E",
    action: () => editor.value?.chain().focus().setTextAlign("center").run(),
  },
  right: {
    icon: "format_align_right",
    value: "right",
    label: "Align Right",
    shortcut: "R",
    action: () => editor.value?.chain().focus().setTextAlign("right").run(),
  },
});

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
      textAlign: {
        default: null,
        parseHTML: (element) => element.style.textAlign,
        renderHTML: (attributes) => ({
          style: attributes.textAlign
            ? `text-align: ${attributes.textAlign}`
            : null,
        }),
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

// Helper function to update current block type
const updateCurrentBlockType = (editor) => {
  const node = editor.state.selection.$head.parent;
  const type = node.attrs.blockType;
  if (type && type !== currentBlockType.value) {
    currentBlockType.value = type;
  }
};

const editor = useEditor({
  extensions: [
    CustomDocument,
    CustomParagraph.configure({
      HTMLAttributes: {
        class: "editor-paragraph",
      },
    }),
    StarterKit.configure({
      document: false,
      paragraph: false,
      bold: true,
      italic: true,
      text: true,
      underline: true,
    }),
    TextAlign.configure({
      types: ["paragraph"],
      alignments: ["left", "center", "right"],
    }),
  ],
  content:
    '<p data-block-type="SCENE_HEADING" class="text-center uppercase font-bold"></p>',
  onUpdate: ({ editor }) => {
    updateCurrentBlockType(editor);
  },
  onSelectionUpdate: ({ editor }) => {
    updateCurrentBlockType(editor);
  },
});

// Parenthetical validation function
const validateParenthetical = (text) => {
  if (!text) return "()";
  let trimmed = text.trim();
  if (!trimmed) return "()";
  if (!trimmed.startsWith("(")) trimmed = "(" + trimmed;
  if (!trimmed.endsWith(")")) trimmed = trimmed + ")";
  return trimmed;
};

// Block type management
const changeBlockType = (type) => {
  if (!editor.value || !FORMATS[type]) return;

  // Get current node before changing block type
  const node = editor.value.state.selection.$head.parent;
  let text = node.textContent;

  // Update the block type first
  editor.value.commands.setNode("paragraph", { blockType: type });

  // If switching to parenthetical, validate/add parentheses
  if (type === "PARENTHETICAL") {
    const validatedText = validateParenthetical(text);
    if (validatedText !== text) {
      // Get the current position after changing block type
      const currentNode = editor.value.state.selection.$head.parent;
      const from = currentNode.pos + 1;
      const to = currentNode.pos + currentNode.nodeSize - 1;

      // Only set selection and insert content if positions are valid
      if (from <= to && from >= 0) {
        editor.value
          .chain()
          .setTextSelection({ from, to })
          .insertContent(validatedText)
          .run();
      }
    }
  }

  currentBlockType.value = type;
};

const handleKeyDown = (e) => {
  if (!editor.value) return;

  if (e[modifierEvent]) {
    const shortcuts = {
      b: () => editor.value.chain().focus().toggleBold().run(),
      i: () => editor.value.chain().focus().toggleItalic().run(),
      s: () => editor.value.chain().focus().toggleStrike().run(),
      l: () => editor.value.chain().focus().setTextAlign("left").run(),
      e: () => editor.value.chain().focus().setTextAlign("center").run(),
      r: () => editor.value.chain().focus().setTextAlign("right").run(),
      z: () => (!e.shiftKey ? undo() : redo()),
    };

    const shortcut = shortcuts[e.key.toLowerCase()];
    if (shortcut) {
      e.preventDefault();
      shortcut();
      return;
    }

    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const type = Object.keys(FORMATS)[parseInt(e.key) - 1];
      if (type) changeBlockType(type);
      return;
    }
  }

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

    // Handle parenthetical validation
    if (currentType === "PARENTHETICAL") {
      const validatedText = validateParenthetical(node.textContent);
      if (validatedText !== node.textContent) {
        const from = node.pos + 1;
        const to = node.pos + node.nodeSize - 1;

        if (from <= to && from >= 0) {
          editor.value
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .insertContent(validatedText)
            .run();
        }
      }
    }

    // Get next block type and create new block
    const nextType = FORMATS[currentType].nextElement;
    editor.value.commands.splitBlock();
    editor.value.commands.setNode("paragraph", { blockType: nextType });
    currentBlockType.value = nextType;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    const types = Object.keys(FORMATS);
    const nextType =
      types[(types.indexOf(currentBlockType.value) + 1) % types.length];
    changeBlockType(nextType);
  }
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

.ProseMirror {
  font-family: "Courier New", Courier, monospace;
  font-size: 12pt;
  line-height: 1.5;
  padding: 1rem;
  outline: none;
  min-height: calc(11in - 2rem);

  strong {
    font-weight: bold;
  }

  em {
    font-style: italic;
  }

  u {
    text-decoration: underline;
  }

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

@media print {
  @page {
    size: 8.5in 11in;
    margin: 0;
  }

  * {
    visibility: hidden;
  }

  body {
    margin: 0;
    padding: 0;
  }

  .editor-container {
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .q-header,
  .q-footer,
  .editor-scroll-area {
    display: none !important;
  }

  .editor-page-container {
    visibility: visible !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    margin: 0 !important;
  }

  .editor-page {
    visibility: visible !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 1in !important;
    width: 8.5in !important;
    min-height: 11in !important;
  }

  .editor-page *,
  .ProseMirror,
  .ProseMirror * {
    visibility: visible !important;
  }

  .page-number {
    color: #000 !important;
  }
}

.print-only {
  @media screen {
    display: none !important;
  }
}

.print\:hidden {
  @media print {
    display: none !important;
  }
}
</style>
