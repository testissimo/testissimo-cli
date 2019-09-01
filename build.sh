# linux-x64-12.9.1
# mac-x64-12.9.1
# windows-x64-12.9.1
# alpine-x64-12.9.1

nexe ./src/testissimo-cli.js -t linux-x64-12.9.1
mv -f testissimo-cli ./dist/linux-x64/testissimo-cli

nexe ./src/testissimo-cli.js -t alpine-x64-12.9.1
mv -f testissimo-cli ./dist/alpine-x64/testissimo-cli

nexe ./src/testissimo-cli.js -t mac-x64-12.9.1
mv -f testissimo-cli ./dist/mac-x64/testissimo-cli

nexe ./src/testissimo-cli.js -t windows-x64-12.9.1
mv -f testissimo-cli.exe ./dist/windows-x64/testissimo-cli.exe