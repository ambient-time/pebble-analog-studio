#ifndef STUDIO_SETTINGS_H
#define STUDIO_SETTINGS_H
#include <stdbool.h>
#include <stddef.h>
#include <string.h>
#define STUDIO_CODE_SIZE 19
#define STUDIO_DEFAULT "L1:1:1:1:0:0:0:0:1"
typedef struct { int recipe, bezel, dial, hands, marks, date, seconds, contrast; } StudioSettings;
/* Exactly eight single-digit fields. Unknown versions/fields never mutate out. */
static bool studio_parse(const char *code, StudioSettings *out) {
  if (!code || !out || strlen(code) != 18 || code[0] != 'L' || code[1] != '1') return false;
  int values[8];
  for (int i = 0; i < 8; i++) {
    int pos = 2 + i * 2;
    if (code[pos] != ':' || code[pos+1] < '0' || code[pos+1] > '9') return false;
    values[i] = code[pos+1] - '0';
    int low = i < 3 ? 1 : 0;
    int high = i == 0 ? 3 : (i < 3 ? 6 : (i < 5 ? 2 : 1));
    if (values[i] < low || values[i] > high) return false;
  }
  StudioSettings candidate = {values[0],values[1],values[2],values[3],values[4],values[5],values[6],values[7]};
  *out = candidate;
  return true;
}
static int studio_art_index(const StudioSettings *s) {
  if (s->bezel <= 3 && s->dial <= 3)
    return (s->recipe - 1) * 9 + (s->bezel - 1) * 3 + s->dial;
  int rank = s->bezel <= 3 ? (s->bezel - 1) * 3 + (s->dial - 3)
    : 9 + (s->bezel - 4) * 6 + s->dial;
  return 27 + (s->recipe - 1) * 27 + rank;
}
#endif
