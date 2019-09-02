FROM ubuntu:18.04
COPY ./dist/linux-x64/testissimo-cli /testissimo-cli

# FROM alpine:3.10
# COPY ./dist/alpine-x64/testissimo-cli /testissimo-cli

# make output colorfull
ENV TERM xterm-256color

ENTRYPOINT ["/testissimo-cli"]