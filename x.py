t = int(input())

ans = 0
while t > 0:
    n = int(input())
    s = input()

    # 1 0 0 0 1 0
    #   x
    #     x
    # 0 1 2 3 4

    primer_0 = s.index('0')
    primer_1 = s[primer_0 + 1:].index('1') + primer_0 +  1

    longitud = primer_1 - primer_0
    ans = max(longitud, ans)

    print(ans)
|
    t -= 1