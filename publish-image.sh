IMAGE_ID=$(docker images testissimo-cli --format "{{.ID}}")
IMAGE_VER=$(grep version package.json | grep -o '[0-9.]\+' -m 1)

echo "tagging image $IMAGE_ID with version $IMAGE_VER"

docker tag $IMAGE_ID testissimo/testissimo-cli:$IMAGE_VER
docker tag $IMAGE_ID testissimo/testissimo-cli:latest
docker push testissimo/testissimo-cli:$IMAGE_VER