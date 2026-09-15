#include <assert.h>
#include <stdio.h>
#include "../src/c/settings.h"
int main(void) {
  StudioSettings s;
  assert(studio_parse(STUDIO_DEFAULT, &s));
  assert(studio_art_index(&s)==1);
  const char *bad[] = {"", "L2:1:1:1:0:0:0:0:0", "L1:0:1:1:0:0:0:0:0", "L1:4:1:1:0:0:0:0:0", "L1:1:7:1:0:0:0:0:0", "L1:1:1:7:0:0:0:0:0", "L1:1:1:1:3:0:0:0:0", "L1:1:1:1:0:3:0:0:0", "L1:1:1:1:0:0:2:0:0", "L1:1:1:1:0:0:0:0:2", "L1:1:1:1:0:0:0:0:0x", "L1:1:1:1:0:0:0:0", "L1:01:1:1:0:0:0:0:0"};
  for (unsigned i=0;i<sizeof(bad)/sizeof(bad[0]);i++) {
    StudioSettings previous=s;
    assert(!studio_parse(bad[i], &s));
    assert(memcmp(&previous,&s,sizeof(s))==0);
  }
  int count=0;
  int indices[109] = {0};
  for(int r=1;r<=3;r++) for(int b=1;b<=6;b++) for(int d=1;d<=6;d++)
  for(int h=0;h<=2;h++) for(int m=0;m<=2;m++) for(int date=0;date<2;date++)
  for(int sec=0;sec<2;sec++) for(int contrast=0;contrast<2;contrast++) {
    char code[STUDIO_CODE_SIZE];
    snprintf(code,sizeof(code),"L1:%d:%d:%d:%d:%d:%d:%d:%d",r,b,d,h,m,date,sec,contrast);
    assert(studio_parse(code,&s));
    int index = studio_art_index(&s);
    assert(index >= 1 && index <= 108);
    indices[index]++;
    if (b<=3 && d<=3) assert(index==(r-1)*9+(b-1)*3+d);
    else assert(index>27);
    count++;
  }
  assert(count == 7776);
  for (int i=1; i<=108; i++) assert(indices[i]==72);
  printf("Validated %d native configurations; malformed codes preserve prior settings.\n",count);
}
