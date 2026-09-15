#include <pebble.h>
#include "settings.h"

#define SETTINGS_KEY 101
static Window *s_window;
static Layer *s_layer;
static GBitmap *s_art;
static StudioSettings s_settings;
static char s_code[STUDIO_CODE_SIZE] = STUDIO_DEFAULT;
static const uint32_t ART_IDS[] = {
  RESOURCE_ID_STUDIO_ART_1, RESOURCE_ID_STUDIO_ART_2, RESOURCE_ID_STUDIO_ART_3,
  RESOURCE_ID_STUDIO_ART_4, RESOURCE_ID_STUDIO_ART_5, RESOURCE_ID_STUDIO_ART_6,
  RESOURCE_ID_STUDIO_ART_7, RESOURCE_ID_STUDIO_ART_8, RESOURCE_ID_STUDIO_ART_9,
  RESOURCE_ID_STUDIO_ART_10, RESOURCE_ID_STUDIO_ART_11, RESOURCE_ID_STUDIO_ART_12,
  RESOURCE_ID_STUDIO_ART_13, RESOURCE_ID_STUDIO_ART_14, RESOURCE_ID_STUDIO_ART_15,
  RESOURCE_ID_STUDIO_ART_16, RESOURCE_ID_STUDIO_ART_17, RESOURCE_ID_STUDIO_ART_18,
  RESOURCE_ID_STUDIO_ART_19, RESOURCE_ID_STUDIO_ART_20, RESOURCE_ID_STUDIO_ART_21,
  RESOURCE_ID_STUDIO_ART_22, RESOURCE_ID_STUDIO_ART_23, RESOURCE_ID_STUDIO_ART_24,
  RESOURCE_ID_STUDIO_ART_25, RESOURCE_ID_STUDIO_ART_26, RESOURCE_ID_STUDIO_ART_27,
  RESOURCE_ID_STUDIO_ART_28, RESOURCE_ID_STUDIO_ART_29, RESOURCE_ID_STUDIO_ART_30,
  RESOURCE_ID_STUDIO_ART_31, RESOURCE_ID_STUDIO_ART_32, RESOURCE_ID_STUDIO_ART_33,
  RESOURCE_ID_STUDIO_ART_34, RESOURCE_ID_STUDIO_ART_35, RESOURCE_ID_STUDIO_ART_36,
  RESOURCE_ID_STUDIO_ART_37, RESOURCE_ID_STUDIO_ART_38, RESOURCE_ID_STUDIO_ART_39,
  RESOURCE_ID_STUDIO_ART_40, RESOURCE_ID_STUDIO_ART_41, RESOURCE_ID_STUDIO_ART_42,
  RESOURCE_ID_STUDIO_ART_43, RESOURCE_ID_STUDIO_ART_44, RESOURCE_ID_STUDIO_ART_45,
  RESOURCE_ID_STUDIO_ART_46, RESOURCE_ID_STUDIO_ART_47, RESOURCE_ID_STUDIO_ART_48,
  RESOURCE_ID_STUDIO_ART_49, RESOURCE_ID_STUDIO_ART_50, RESOURCE_ID_STUDIO_ART_51,
  RESOURCE_ID_STUDIO_ART_52, RESOURCE_ID_STUDIO_ART_53, RESOURCE_ID_STUDIO_ART_54,
  RESOURCE_ID_STUDIO_ART_55, RESOURCE_ID_STUDIO_ART_56, RESOURCE_ID_STUDIO_ART_57,
  RESOURCE_ID_STUDIO_ART_58, RESOURCE_ID_STUDIO_ART_59, RESOURCE_ID_STUDIO_ART_60,
  RESOURCE_ID_STUDIO_ART_61, RESOURCE_ID_STUDIO_ART_62, RESOURCE_ID_STUDIO_ART_63,
  RESOURCE_ID_STUDIO_ART_64, RESOURCE_ID_STUDIO_ART_65, RESOURCE_ID_STUDIO_ART_66,
  RESOURCE_ID_STUDIO_ART_67, RESOURCE_ID_STUDIO_ART_68, RESOURCE_ID_STUDIO_ART_69,
  RESOURCE_ID_STUDIO_ART_70, RESOURCE_ID_STUDIO_ART_71, RESOURCE_ID_STUDIO_ART_72,
  RESOURCE_ID_STUDIO_ART_73, RESOURCE_ID_STUDIO_ART_74, RESOURCE_ID_STUDIO_ART_75,
  RESOURCE_ID_STUDIO_ART_76, RESOURCE_ID_STUDIO_ART_77, RESOURCE_ID_STUDIO_ART_78,
  RESOURCE_ID_STUDIO_ART_79, RESOURCE_ID_STUDIO_ART_80, RESOURCE_ID_STUDIO_ART_81,
  RESOURCE_ID_STUDIO_ART_82, RESOURCE_ID_STUDIO_ART_83, RESOURCE_ID_STUDIO_ART_84,
  RESOURCE_ID_STUDIO_ART_85, RESOURCE_ID_STUDIO_ART_86, RESOURCE_ID_STUDIO_ART_87,
  RESOURCE_ID_STUDIO_ART_88, RESOURCE_ID_STUDIO_ART_89, RESOURCE_ID_STUDIO_ART_90,
  RESOURCE_ID_STUDIO_ART_91, RESOURCE_ID_STUDIO_ART_92, RESOURCE_ID_STUDIO_ART_93,
  RESOURCE_ID_STUDIO_ART_94, RESOURCE_ID_STUDIO_ART_95, RESOURCE_ID_STUDIO_ART_96,
  RESOURCE_ID_STUDIO_ART_97, RESOURCE_ID_STUDIO_ART_98, RESOURCE_ID_STUDIO_ART_99,
  RESOURCE_ID_STUDIO_ART_100, RESOURCE_ID_STUDIO_ART_101, RESOURCE_ID_STUDIO_ART_102,
  RESOURCE_ID_STUDIO_ART_103, RESOURCE_ID_STUDIO_ART_104, RESOURCE_ID_STUDIO_ART_105,
  RESOURCE_ID_STUDIO_ART_106, RESOURCE_ID_STUDIO_ART_107, RESOURCE_ID_STUDIO_ART_108
};

static GPoint polar(GPoint c, int radius, int32_t angle) {
  return GPoint(c.x + (int32_t)radius * sin_lookup(angle) / TRIG_MAX_RATIO,
                c.y - (int32_t)radius * cos_lookup(angle) / TRIG_MAX_RATIO);
}

static GColor ink_color(void) {
#ifdef PBL_COLOR
  if (!s_settings.contrast) {
    static const uint32_t inks[] = {0x6A3C22,0x1A1C22,0xD8CDBB,0xB9E7D5,0xEEEEEE,0xFFE0E8};
    return GColorFromHEX(inks[s_settings.dial-1]);
  }
#endif
  return s_settings.dial >= 3 ? GColorWhite : GColorBlack;
}

static void draw(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  GPoint center = GPoint(bounds.size.w / 2, bounds.size.h / 2);
  int radius = (bounds.size.w < bounds.size.h ? bounds.size.w : bounds.size.h) * PBL_IF_ROUND_ELSE(40, 43) / 100;
  graphics_context_set_fill_color(ctx, s_settings.dial >= 3 ? GColorBlack : GColorWhite);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);
  if (s_art) graphics_draw_bitmap_in_rect(ctx, s_art, bounds);
#ifdef PBL_COLOR
  graphics_context_set_antialiased(ctx, true);
#endif
  GColor ink = ink_color();
  graphics_context_set_stroke_color(ctx, ink);
  graphics_context_set_text_color(ctx, ink);
  int marks = s_settings.marks ? s_settings.marks : (s_settings.recipe == 1 ? 2 : 1);
  int count = marks == 2 ? 12 : (s_settings.recipe == 2 ? 60 : 12);
  GFont font = fonts_get_system_font(bounds.size.w >= 260 ? FONT_KEY_GOTHIC_24_BOLD : bounds.size.w > 144 ? FONT_KEY_GOTHIC_18_BOLD : FONT_KEY_GOTHIC_14_BOLD);
  for (int i = 0; i < count; i++) {
    int32_t angle = TRIG_MAX_ANGLE * i / count;
    if (marks == 2) {
      GPoint p = polar(center, radius * 88 / 100, angle);
      char numeral[3];
      snprintf(numeral, sizeof(numeral), "%d", i == 0 ? 12 : i);
      int height = bounds.size.w >= 260 ? 28 : bounds.size.w > 144 ? 22 : 18;
      graphics_draw_text(ctx, numeral, font, GRect(p.x-13,p.y-height/2-2,26,height), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
    } else {
      graphics_context_set_stroke_width(ctx, (count == 12 || i % 5 == 0) ? 2 : 1);
      int inner = radius * ((count == 12 || i % 5 == 0) ? 81 : 85) / 100;
      graphics_draw_line(ctx, polar(center, inner, angle), polar(center, radius * 88 / 100, angle));
    }
  }
  time_t now = time(NULL);
  struct tm *t = localtime(&now);
  if (s_settings.date) {
    char day[3];
    snprintf(day, sizeof(day), "%d", t->tm_mday);
    GRect date_rect = GRect(center.x+radius*55/100-12, center.y-10, 24, 20);
    graphics_context_set_fill_color(ctx, s_settings.dial >= 3 ? GColorBlack : GColorWhite);
    graphics_fill_rect(ctx, date_rect, 2, GCornersAll);
    graphics_draw_text(ctx, day, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), date_rect, GTextOverflowModeFill, GTextAlignmentCenter, NULL);
  }
  int hands = s_settings.hands ? s_settings.hands : 1;
  int32_t hour = ((t->tm_hour % 12) * 60 + t->tm_min) * TRIG_MAX_ANGLE / 720;
  int32_t minute = (t->tm_min * 60 + (s_settings.seconds ? t->tm_sec : 0)) * TRIG_MAX_ANGLE / 3600;
  graphics_context_set_stroke_color(ctx, ink);
  graphics_context_set_stroke_width(ctx, hands == 2 ? 5 : 3);
  graphics_draw_line(ctx, center, polar(center, radius * 59 / 100, hour));
  graphics_context_set_stroke_width(ctx, hands == 2 ? 3 : 2);
  graphics_draw_line(ctx, center, polar(center, radius * 84 / 100, minute));
  if (s_settings.seconds) {
    GColor accent = ink;
#ifdef PBL_COLOR
    static const uint32_t accents[] = {0x8A5A38,0xC43A2E,0xCF8C5E,0xC8784C,0x6BAAD8,0x7EC8A8};
    accent = GColorFromHEX(accents[s_settings.bezel-1]);
#endif
    graphics_context_set_stroke_color(ctx, accent);
    graphics_context_set_stroke_width(ctx, 1);
    graphics_draw_line(ctx, polar(center, -radius/8, t->tm_sec * TRIG_MAX_ANGLE/60), polar(center, radius*91/100,t->tm_sec * TRIG_MAX_ANGLE/60));
  }
  graphics_context_set_fill_color(ctx, ink);
  graphics_fill_circle(ctx, center, 3);
}

static void tick(struct tm *time, TimeUnits units) {
  (void)time; (void)units;
  if (s_layer) layer_mark_dirty(s_layer);
}

static GBitmap *load_art(int index, const StudioSettings *settings) {
  GBitmap *bitmap = gbitmap_create_with_resource(ART_IDS[index - 1]);
#ifdef PBL_PLATFORM_GABBRO
  // Each recipe stores one four-tone material mask. Recolor a fresh bitmap,
  // never a previously recolored palette; no settings or artwork IDs change.
  if (bitmap) {
    static const uint32_t metals[6][3] = {
      {0xAA5500,0xFFAA55,0xFFFFAA}, {0x555555,0xAAAAAA,0xFFFFFF},
      {0x000000,0x555555,0xAAAAAA}, {0x550000,0xAA5500,0xFFAAAA},
      {0x000055,0x5555AA,0xAAAAFF}, {0x005555,0x55AA55,0xAAFFAA}
    };
    static const uint32_t plates[] = {0xFFFFAA,0xFFFFFF,0x000000,0x005555,0x0055AA,0x550000};
    GColor *palette = gbitmap_get_palette(bitmap);
    if (!palette) { gbitmap_destroy(bitmap); return NULL; }
    for (int i=0;i<4;i++) {
      int tone = palette[i].argb & 3;
      palette[i] = GColorFromHEX(tone ? metals[settings->bezel-1][tone-1] : plates[settings->dial-1]);
    }
  }
#else
  (void)settings;
#endif
  return bitmap;
}

static bool apply_code(const char *code, bool save) {
  StudioSettings candidate;
  if (!studio_parse(code, &candidate)) return false;
  int old_index = studio_art_index(&s_settings);
  int new_index = studio_art_index(&candidate);
  if (!s_art || new_index != old_index) {
    if (s_art) gbitmap_destroy(s_art);
    s_art = NULL;
    s_art = load_art(new_index, &candidate);
    if (!s_art) {
      if (old_index >= 1 && old_index <= (int)(sizeof(ART_IDS)/sizeof(ART_IDS[0]))) s_art = load_art(old_index, &s_settings);
      APP_LOG(APP_LOG_LEVEL_ERROR, "Studio: material load failed; settings unchanged");
      return false;
    }
  }
  if (save && persist_write_string(SETTINGS_KEY, code) < 0) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Studio: settings storage failed");
    if (new_index != old_index) {
      gbitmap_destroy(s_art);
      s_art = load_art(old_index, &s_settings);
    }
    return false;
  }
  s_settings = candidate;
  if (code != s_code) strncpy(s_code, code, sizeof(s_code));
  tick_timer_service_subscribe(s_settings.seconds ? SECOND_UNIT : MINUTE_UNIT, tick);
  if (s_layer) layer_mark_dirty(s_layer);
  APP_LOG(APP_LOG_LEVEL_INFO, "Studio: %s heap %u", s_code, (unsigned)heap_bytes_free());
  return true;
}

static void inbox(DictionaryIterator *iter, void *context) {
  (void)context;
  Tuple *value = dict_find(iter, MESSAGE_KEY_STUDIO_CODE);
  char received[STUDIO_CODE_SIZE];
  if (!value || value->type != TUPLE_CSTRING || value->length != STUDIO_CODE_SIZE) {
    APP_LOG(APP_LOG_LEVEL_WARNING, "Studio: rejected configuration");
    return;
  }
  memcpy(received, value->value, sizeof(received));
  if (received[STUDIO_CODE_SIZE-1] != '\0' || !apply_code(received, true)) {
    APP_LOG(APP_LOG_LEVEL_WARNING, "Studio: rejected configuration");
  }
}
static void load(Window *window) {
  s_layer = layer_create(layer_get_bounds(window_get_root_layer(window)));
  layer_set_update_proc(s_layer, draw);
  layer_add_child(window_get_root_layer(window), s_layer);
  apply_code(s_code, false);
}
static void unload(Window *window) {
  (void)window;
  layer_destroy(s_layer); s_layer = NULL;
  if (s_art) gbitmap_destroy(s_art);
  s_art = NULL;
}
static void init(void) {
  studio_parse(STUDIO_DEFAULT, &s_settings);
  char restored[STUDIO_CODE_SIZE];
  StudioSettings candidate;
  if (persist_get_size(SETTINGS_KEY) == STUDIO_CODE_SIZE && persist_read_string(SETTINGS_KEY, restored, sizeof(restored)) == STUDIO_CODE_SIZE && studio_parse(restored, &candidate)) {
    strcpy(s_code, restored); s_settings = candidate;
  }
  s_window = window_create();
  window_set_window_handlers(s_window, (WindowHandlers){.load=load,.unload=unload});
  app_message_register_inbox_received(inbox);
  app_message_open(128, 64);
  window_stack_push(s_window, true);
}
static void deinit(void) {
  tick_timer_service_unsubscribe();
  app_message_deregister_callbacks();
  window_destroy(s_window);
}
int main(void) { init(); app_event_loop(); deinit(); }
